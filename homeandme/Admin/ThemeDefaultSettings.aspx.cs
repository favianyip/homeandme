using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Globalization;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_ThemeDefaultSettings : System.Web.UI.Page
{
    string ErrorIfAny = String.Empty;
    string ThemeID = String.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session["ThemeID"] == null)
        {
            Response.Redirect("/Admin/ManageThemeSettings.aspx");
        }
        else
        {
            ThemeID = Session["ThemeID"].ToString();
            if (!IsPostBack)
            {
                GridDefaultWorkTypes.DataBind();
            }
        }
    }

    protected void lnkBackToThemes_Click(object sender, EventArgs e)
    {
        try
        {
            Response.Redirect("/Admin/ManageThemeSettings.aspx");
        }
        catch (Exception ex) { }
    }

    protected void btnConfigure_Click(object sender, EventArgs e)
    {
        try
        {
            string SubSubOptionL3ID = ((LinkButton)sender).CommandArgument;
            HfDefaultWorkTypeID.Value = SubSubOptionL3ID;
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT Length, Width, Numbers, UOM, REPLACE(CONVERT(VARCHAR, CONVERT(MONEY, Rate), 1), '.00', '') AS Rate " +
                                     "FROM ThemeConfiguration WHERE SubSubOptionL3ID = @SubSubOptionL3ID AND ThemeID = @ThemeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", SubSubOptionL3ID));
                SqlParameters.Add(new SqlParameter("ThemeID", ThemeID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    if (ds.Tables[0].Rows[0]["UOM"].ToString() == "1")
                    {
                        PopupConfigure.ShowOnPageLoad = true;
                        DivMeasurement.Visible = true;
                        DivNumbers.Visible = false;
                        txtLength.Text = ds.Tables[0].Rows[0]["Length"].ToString();
                        txtWidth.Text = ds.Tables[0].Rows[0]["Width"].ToString();
                        lblPrice.Text = ds.Tables[0].Rows[0]["Rate"].ToString();
                    }
                    else
                    {
                        PopupConfigure.ShowOnPageLoad = true;
                        DivMeasurement.Visible = false;
                        DivNumbers.Visible = true;
                        txtQuantity.Text = ds.Tables[0].Rows[0]["Numbers"].ToString();
                        lblPrice.Text = ds.Tables[0].Rows[0]["Rate"].ToString();
                    }
                    Session["UOM"] = ds.Tables[0].Rows[0]["UOM"].ToString();
                    GetServiceRateBasePrice(SubSubOptionL3ID);
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        try
        {
            PopupConfigure.ShowOnPageLoad = false;
            GridDefaultWorkTypes.DataBind();
        }
        catch (Exception ex) { }
    }

    protected void btnSaveDefault_Click(object sender, EventArgs e)
    {
        try
        {
            double Price = 0;
            double Length = 0;
            double Width = 0;
            int Quantity = 0;
            if (txtLength.Text != "")
            {
                Length = Convert.ToDouble(txtLength.Text.Trim());
            }
            if (txtWidth.Text != "")
            {
                Width = Convert.ToDouble(txtWidth.Text.Trim());
            }
            if (txtQuantity.Text != "")
            {
                Quantity = Convert.ToInt32(txtQuantity.Text.Trim());
            }
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            if (HfDefaultWorkTypeID.Value != "" && HfDefaultWorkTypeID.Value != null)
            {
                if (Session["UOM"] != null)
                {
                    if (Session["UOM"].ToString() == "1")
                    {
                        Price = Length * Width * Convert.ToInt32(Session["Price"]);
                        {
                            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                            SQLContainer.Query = "UPDATE ThemeConfiguration SET Length = @Length, Width = @Width, Rate = @Rate " +
                                                 "WHERE SubSubOptionL3ID = @SubSubOptionL3ID AND ThemeID = @ThemeID";
                            List<SqlParameter> SqlParameters = new List<SqlParameter>();
                            SqlParameters.Add(new SqlParameter("Length", Length));
                            SqlParameters.Add(new SqlParameter("Width", Width));
                            SqlParameters.Add(new SqlParameter("Rate", Price));
                            SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", HfDefaultWorkTypeID.Value.ToString()));
                            SqlParameters.Add(new SqlParameter("ThemeID", ThemeID));
                            SQLContainer.SqlParameters = SqlParameters;
                            SQLCommands.Add(SQLContainer);
                        }
                    }
                    else
                    {
                        Price = Quantity * Convert.ToInt32(Session["Price"]);
                        {
                            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                            SQLContainer.Query = "UPDATE ThemeConfiguration SET Numbers = @Quantity, Rate = @Price WHERE SubSubOptionL3ID = @SubSubOptionL3ID " +
                                                 "AND ThemeID = @ThemeID";
                            List<SqlParameter> SqlParameters = new List<SqlParameter>();
                            SqlParameters.Add(new SqlParameter("Quantity", Quantity));
                            SqlParameters.Add(new SqlParameter("Price", Price));
                            SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", HfDefaultWorkTypeID.Value.ToString()));
                            SqlParameters.Add(new SqlParameter("ThemeID", ThemeID));
                            SQLContainer.SqlParameters = SqlParameters;
                            SQLCommands.Add(SQLContainer);
                        }
                    }
                    if (Tools.ExecuteSQL(SQLCommands, out ErrorIfAny))
                    {
                        PopupConfigure.ShowOnPageLoad = false;
                        GridDefaultWorkTypes.DataBind();
                    }
                }
            }
        }
        catch (Exception ex) { }
    }

    void GetServiceRateBasePrice(string SubSubOptionL3ID)
    {
        DataSet ds = new DataSet();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT * FROM ServiceRate WHERE SubSubOptionL3ID = @SubSubOptionL3ID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", SubSubOptionL3ID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                Session["Price"] = ds.Tables[0].Rows[0]["Rate"].ToString();
            }
        }
    }

    protected void btnCancelDefault_Click(object sender, EventArgs e)
    {
        try
        {
            PopupConfigure.ShowOnPageLoad = false;
            GridDefaultWorkTypes.DataBind();
        }
        catch (Exception ex) { }
    }

    protected void txtLength_TextChanged(object sender, EventArgs e)
    {
        try
        {
            double Price = 0;
            double Length = 0;
            double Width = 0;
            if (txtLength.Text != "")
            {
                Length = Convert.ToDouble(txtLength.Text.Trim());
            }
            if (txtWidth.Text != "")
            {
                Width = Convert.ToDouble(txtWidth.Text.Trim());
            }
            Price = Length * Width * Convert.ToInt32(Session["Price"]);
            lblPrice.Text = Price.ToString("#,##0");
        }
        catch (Exception ex) { }
    }

    protected void txtWidth_TextChanged(object sender, EventArgs e)
    {
        try
        {
            double Price = 0;
            double Length = 0;
            double Width = 0;
            if (txtLength.Text != "")
            {
                Length = Convert.ToDouble(txtLength.Text.Trim());
            }
            if (txtWidth.Text != "")
            {
                Width = Convert.ToDouble(txtWidth.Text.Trim());
            }
            Price = Length * Width * Convert.ToInt32(Session["Price"]);
            lblPrice.Text = Price.ToString("#,##0");
        }
        catch (Exception ex) { }
    }

    protected void txtQuantity_TextChanged(object sender, EventArgs e)
    {
        double Price = 0;
        int Quantity = 0;
        if (txtQuantity.Text != "")
        {
            Quantity = Convert.ToInt32(txtQuantity.Text.Trim());
        }
        Price = Quantity * Convert.ToInt32(Session["Price"]);
        lblPrice.Text = Price.ToString("#,##0");
    }
}