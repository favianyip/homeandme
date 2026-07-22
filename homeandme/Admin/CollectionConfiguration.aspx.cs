using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_CollectionConfiguration : System.Web.UI.Page
{
    string ErrorIfAny = String.Empty;
    string SubsubOptionL3ID = String.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session["SubsubOptionL3ID"] == null)
        {
            Response.Redirect("/Admin/ManageServiceRate.aspx");
        }
        else
        {
            SubsubOptionL3ID = Session["SubsubOptionL3ID"].ToString();
            if (!IsPostBack)
            {
                GetDataCollection(SubsubOptionL3ID);
            }
        }
    }

    void GetDataCollection(string SubsubOptionL3ID)
    {
        try
        {
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetServiceRateDetails @SubSubOptionL3ID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", SubsubOptionL3ID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    txtLengthText.Text = Convert.ToString(ds.Tables[0].Rows[0]["DisplayTextLength"]) == "" ? "Length" : ds.Tables[0].Rows[0]["DisplayTextLength"].ToString();
                    txtWidthText.Text = Convert.ToString(ds.Tables[0].Rows[0]["DisplayTextWidth"]) == "" ? "Width" : ds.Tables[0].Rows[0]["DisplayTextWidth"].ToString();
                    txtHeightText.Text = Convert.ToString(ds.Tables[0].Rows[0]["DisplayTextHeight"]) == "" ? "Height" : ds.Tables[0].Rows[0]["DisplayTextHeight"].ToString();
                    txtThicknessText.Text = Convert.ToString(ds.Tables[0].Rows[0]["DisplayTextThickness"]) == "" ? "Thickness" : ds.Tables[0].Rows[0]["DisplayTextThickness"].ToString();
                    txtQuantityText.Text = Convert.ToString(ds.Tables[0].Rows[0]["DisplayTextQuantity"]) == "" ? "Quantity" : ds.Tables[0].Rows[0]["DisplayTextQuantity"].ToString();
                    txtLength.Text = Convert.ToString(ds.Tables[0].Rows[0]["DefaultLength"]);
                    txtWidth.Text = Convert.ToString(ds.Tables[0].Rows[0]["DefaultWidth"]);
                    txtHeight.Text = Convert.ToString(ds.Tables[0].Rows[0]["DefaultHeight"]);
                    txtThickness.Text = Convert.ToString(ds.Tables[0].Rows[0]["DefaultThickness"]);
                    txtQuantity.Text = Convert.ToString(ds.Tables[0].Rows[0]["DefaultQuantity"]);
                    cbHeight.Checked = Convert.ToString(ds.Tables[0].Rows[0]["Height"]) == "1" ? true : false;
                    cbLength.Checked = Convert.ToString(ds.Tables[0].Rows[0]["Length"]) == "1" ? true : false;
                    cbWidth.Checked = Convert.ToString(ds.Tables[0].Rows[0]["Width"]) == "1" ? true : false;
                    cbThickness.Checked = Convert.ToString(ds.Tables[0].Rows[0]["Thickness"]) == "1" ? true : false;
                    cbQuantity.Checked = Convert.ToString(ds.Tables[0].Rows[0]["Numbers"]) == "1" ? true : false;
                    lblOptionLevel.Text = Convert.ToString(ds.Tables[0].Rows[0]["OptionLevel"]);
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void btnSubmit_Click(object sender, EventArgs e)
    {
        try
        {
            int Height = 0;
            int Width = 0;
            int Length = 0;
            int Thickness = 0;
            int Quantity = 0;
            if (cbHeight.Checked == true)
            {
                Height = 1;
            }
            if (cbWidth.Checked == true)
            {
                Width = 1;
            }
            if (cbLength.Checked == true)
            {
                Length = 1;
            }
            if (cbThickness.Checked == true)
            {
                Thickness = 1;
            }
            if (cbQuantity.Checked == true)
            {
                Quantity = 1;
            }
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UpdateDataCollection @Height, @Width, @Length, @Thickness, @Quantity, @SubSubOptionL3ID, " +
                                     "@DisplayTextLength, @DisplayTextWidth, @DisplayTextHeight, @DisplayTextThickness, @DisplayTextQuantity," +
                                     "@DefaultLength, @DefaultWidth, @DefaultHeight, @DefaultThickness, @DefaultQuantity";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("Height", Height));
                SqlParameters.Add(new SqlParameter("Width", Width));
                SqlParameters.Add(new SqlParameter("Length", Length));
                SqlParameters.Add(new SqlParameter("Thickness", Thickness));
                SqlParameters.Add(new SqlParameter("Quantity", Quantity));
                SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", SubsubOptionL3ID));
                SqlParameters.Add(new SqlParameter("DisplayTextLength", txtLengthText.Text.Trim()));
                SqlParameters.Add(new SqlParameter("DisplayTextWidth", txtWidthText.Text.Trim()));
                SqlParameters.Add(new SqlParameter("DisplayTextHeight", txtHeightText.Text.Trim()));
                SqlParameters.Add(new SqlParameter("DisplayTextThickness", txtThicknessText.Text.Trim()));
                SqlParameters.Add(new SqlParameter("DisplayTextQuantity", txtQuantityText.Text.Trim()));
                SqlParameters.Add(new SqlParameter("DefaultLength", txtLength.Text.Trim()));
                SqlParameters.Add(new SqlParameter("DefaultWidth", txtWidth.Text.Trim()));
                SqlParameters.Add(new SqlParameter("DefaultHeight", txtHeight.Text.Trim()));
                SqlParameters.Add(new SqlParameter("DefaultThickness", txtThickness.Text.Trim()));
                SqlParameters.Add(new SqlParameter("DefaultQuantity", txtQuantity.Text.Trim()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                lblMsg.Text = "Updated successfully";
            }
            else
            {
                lblMsg.Text = "Error Found,Please try again!";
            }
        }
        catch (Exception eX)
        {
            lblMsg.Text = "Error Found,Please try again!";
        }
    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        Response.Redirect("/Admin/ManageServiceRate.aspx");
    }

    protected void lnkBack_Click(object sender, EventArgs e)
    {
        Response.Redirect("/Admin/ManageServiceRate.aspx");
    }
}