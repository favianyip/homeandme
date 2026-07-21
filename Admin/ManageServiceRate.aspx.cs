using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Data;
using System.Data.SqlClient;

public partial class Admin_ManageServiceRate : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session[Tools.SessionVariables.AdminUserID] == null)
        {
            Response.Redirect("/Admin.aspx");
        }
    }

    protected void BtnSubmitPrice_Click(object sender, EventArgs e)
    {
        try
        {
            int Height = 0;
            int Width = 0;
            int Length = 0;
            int Thickness = 0;
            int Numbers = 0;
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
            if (Convert.ToString(cmbUOM.SelectedItem.Value) == "2")
            {
                Numbers = 1;
            }
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UpdateSericeRateDetails @UOM, @Height, @Width, @Length, @Thickness, @Numbers, @Rate, @SubSubOptionL3ID, " +
                                     "@DisplayTextLength, @DisplayTextWidth, @DisplayTextQuantity";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("UOM", cmbUOM.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("Height", Height));
                SqlParameters.Add(new SqlParameter("Width", Width));
                SqlParameters.Add(new SqlParameter("Length", Length));
                SqlParameters.Add(new SqlParameter("Thickness", Thickness));
                SqlParameters.Add(new SqlParameter("Numbers", Numbers));
                SqlParameters.Add(new SqlParameter("Rate", txtPrice.Text.Trim()));
                SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", hdnSubsubOptionL3ID.Value));
                SqlParameters.Add(new SqlParameter("DisplayTextLength", txtLengthText.Text.Trim()));
                SqlParameters.Add(new SqlParameter("DisplayTextWidth", txtWidthText.Text.Trim()));
                SqlParameters.Add(new SqlParameter("DisplayTextQuantity", txtQuantityText.Text.Trim()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                GridServiceRate.DataBind();
                divServiceRatesGrid.Visible = true;
                divRateForm.Visible = false;
                txtLengthText.Text = "";
                txtWidthText.Text = "";
                txtQuantityText.Text = "";
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

    protected void BtnCancel_Click(object sender, EventArgs e)
    {
        try
        {
            divServiceRatesGrid.Visible = true;
            divRateForm.Visible = false;
        }
        catch (Exception eX) { }
    }

    protected void btnEdit_Click(object sender, EventArgs e)
    {
        try
        {
            divRateForm.Visible = true;
            divServiceRatesGrid.Visible = false;
            LinkButton btn = (LinkButton)sender;
            hdnSubsubOptionL3ID.Value = btn.CommandArgument;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetServiceRateDetails @SubSubOptionL3ID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", hdnSubsubOptionL3ID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    if (Convert.ToString(ds.Tables[0].Rows[0]["UOM"]) != "1" && Convert.ToString(ds.Tables[0].Rows[0]["UOM"]) != "2")
                    {
                        cmbUOM.SelectedIndex = cmbUOM.Items.IndexOf(cmbUOM.Items.FindByValue(Convert.ToString("-1")));
                    }
                    else
                    {
                        cmbUOM.SelectedIndex = cmbUOM.Items.IndexOf(cmbUOM.Items.FindByValue(Convert.ToString(ds.Tables[0].Rows[0]["UOM"])));
                    }
                    if (Convert.ToString(ds.Tables[0].Rows[0]["UOM"]) == "1")
                    {
                        divMeasurement.Visible = true;
                        DivMeasurementText.Visible = true;
                        DivNumbersText.Visible = false;
                        txtLengthText.Text = Convert.ToString(ds.Tables[0].Rows[0]["DisplayTextLength"]) == "" ? "Length" : ds.Tables[0].Rows[0]["DisplayTextLength"].ToString();
                        txtWidthText.Text = Convert.ToString(ds.Tables[0].Rows[0]["DisplayTextWidth"]) == "" ? "Width" : ds.Tables[0].Rows[0]["DisplayTextWidth"].ToString();
                    }
                    else
                    {
                        divMeasurement.Visible = false;
                        DivMeasurementText.Visible = false;
                        DivNumbersText.Visible = true;
                        txtQuantityText.Text = Convert.ToString(ds.Tables[0].Rows[0]["DisplayTextQuantity"]) == "" ? "Quantity" : ds.Tables[0].Rows[0]["DisplayTextQuantity"].ToString();
                    }
                    cbHeight.Checked = Convert.ToString(ds.Tables[0].Rows[0]["Height"]) == "1" ? true : false;
                    cbLength.Checked = Convert.ToString(ds.Tables[0].Rows[0]["Length"]) == "1" ? true : false;
                    cbWidth.Checked = Convert.ToString(ds.Tables[0].Rows[0]["Width"]) == "1" ? true : false;
                    cbThickness.Checked = Convert.ToString(ds.Tables[0].Rows[0]["Thickness"]) == "1" ? true : false;
                    txtPrice.Text = Convert.ToString(ds.Tables[0].Rows[0]["Rate"]);
                    lblOptionLevel.Text = Convert.ToString(ds.Tables[0].Rows[0]["OptionLevel"]);
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void cmbUOM_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            if (Convert.ToString(cmbUOM.SelectedItem.Value) == "1")
            {
                divMeasurement.Visible = true;
                DivMeasurementText.Visible = true;
                DivNumbersText.Visible = false;
                txtLengthText.Text = "Length";
                txtWidthText.Text = "Width";
            }
            else
            {
                divMeasurement.Visible = false;
                DivMeasurementText.Visible = false;
                DivNumbersText.Visible = true;
                cbHeight.Checked = false;
                cbWidth.Checked = false;
                cbLength.Checked = false;
                cbThickness.Checked = false;
                txtQuantityText.Text = "Quantity";
            }
        }
        catch { }
    }

    protected void btnDataCollection_Click(object sender, EventArgs e)
    {
        try
        {
            string SubsubOptionL3ID = ((LinkButton)sender).CommandArgument;
            Session["SubsubOptionL3ID"] = SubsubOptionL3ID.ToString();
            Response.Redirect("/Admin/CollectionConfiguration.aspx");
        }
        catch (Exception eX) { }
    }
}