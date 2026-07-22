using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_ManageApplicationValues : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {

    }
    protected void lnkEdit_Click(object sender, EventArgs e)
    {
        try
        {
            divGrid.Visible = false;
            divForm.Visible = true;
            ddlType.DataBind();
            ddlStatus.DataBind();
            txtItemAmount.Text = String.Empty;
            txtCode.Text = String.Empty;
            txtName.Text = String.Empty;
            lblCurrentFileURL.Text = String.Empty;
            LinkButton lnk = (LinkButton)sender;
            string ID = lnk.CommandArgument;
            hdnID.Value = ID.ToString();
            string ErrorIfAny = String.Empty;
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM ApplicationDetails WHERE ApplicationDetailID = @ApplicationDetailID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ApplicationDetailID", ID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    txtCode.Text = Convert.ToString(ds.Tables[0].Rows[0]["ItemCode"]);
                    txtName.Text = Convert.ToString(ds.Tables[0].Rows[0]["ItemText"]);
                    hdnItemType.Value = Convert.ToString(ds.Tables[0].Rows[0]["Type"]);
                    ddlType.SelectedValue = Convert.ToString(ds.Tables[0].Rows[0]["Type"]);
                    ddlStatus.SelectedValue = Convert.ToString(ds.Tables[0].Rows[0]["Status"]);
                    rblAmountOrPercentage.DataBind();
                    divAmountOrPercentage.Visible = false;
                    divIsLoanFee.Visible = false;
                    if (hdnItemType.Value == "1")
                    {
                        divFeeType.Visible = true;
                        divFileType.Visible = false;
                        divAmountOrPercentage.Visible = true;
                        divIsLoanFee.Visible = true;
                        chkIsLoanFee.Checked = Convert.ToBoolean(Convert.ToInt32(ds.Tables[0].Rows[0]["IsLoanFee"]));
                        txtItemAmount.Text = Convert.ToString(ds.Tables[0].Rows[0]["Amount"]);
                        rblAmountOrPercentage.SelectedValue = Convert.ToString(ds.Tables[0].Rows[0]["AmountOrPercentage"]);
                    }
                    else if (hdnItemType.Value == "2" || hdnItemType.Value == "3")
                    {
                        divFeeType.Visible = false;
                        divFileType.Visible = true;
                        lblCurrentFileURL.Text = Convert.ToString(ds.Tables[0].Rows[0]["ItemFileURL"]);
                        Session["itemPath"] = Convert.ToString(ds.Tables[0].Rows[0]["ItemFileURL"]);
                    }
                    else
                    {
                        divFeeType.Visible = false;
                        divFileType.Visible = false;
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnUpdate_Click(object sender, EventArgs e)
    {
        try
        {
            string itemPath = String.Empty;
            string OriginalFileName = String.Empty;
            string[] ExtensionArray = new string[0];
            int IsLoanFee = 0;
            if (chkIsLoanFee.Checked == true)
            {
                IsLoanFee = 1;
            }
            if (hdnItemType.Value == "2" || hdnItemType.Value == "3")
            {
                if (flItemFiles.HasFile)
                {
                    FileInfo FileName = new FileInfo(flItemFiles.PostedFile.FileName);
                    OriginalFileName = FileName.ToString();
                    ExtensionArray = OriginalFileName.Split('.');
                    if (ExtensionArray[1] != "pdf")
                    {
                        ErrorDisplay.ShowAlertMessage("Please select the pdf file.");
                        return;
                    }
                    OriginalFileName = ExtensionArray[0] + "_" + DateTime.Now.ToString("yyyyMMddHHmmss") + "." + ExtensionArray[ExtensionArray.Length - 1];
                    flItemFiles.SaveAs(Server.MapPath("/UploadedFiles/ApplicationForms/") + OriginalFileName);
                    itemPath = ConfigurationManager.AppSettings["BaseUrl"] + "ApplicationForms/" + OriginalFileName;
                    Session["itemPath"] = itemPath;
                }
                else
                {
                    if (Session["itemPath"] == "" || Session["itemPath"] == null)
                    {
                        ErrorDisplay.ShowAlertMessage("Please select the file.");
                        return;
                    }
                }
            }
            if (hdnID.Value != "-1")
            {
                string ErrorIfAny = String.Empty;
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "UpdateApplicationDetails @ItemText,@ItemCode,@Type,@ItemFileURL,@Amount,@AmountOrPercentage,@IsLoanFee,@Status,@ApplicationDetailID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ItemText", txtName.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("ItemCode", txtCode.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("Type", ddlType.SelectedValue));
                    if (ddlType.SelectedValue == "1")
                    {
                        SqlParameters.Add(new SqlParameter("ItemFileURL", ""));
                        SqlParameters.Add(new SqlParameter("Amount", txtItemAmount.Text.Trim()));
                        SqlParameters.Add(new SqlParameter("AmountOrPercentage", rblAmountOrPercentage.SelectedValue));
                        SqlParameters.Add(new SqlParameter("IsLoanFee", IsLoanFee));
                    }
                    else
                    {
                        SqlParameters.Add(new SqlParameter("ItemFileURL", Session["itemPath"]));
                        SqlParameters.Add(new SqlParameter("Amount", ""));
                        SqlParameters.Add(new SqlParameter("AmountOrPercentage", "-1"));
                        SqlParameters.Add(new SqlParameter("IsLoanFee", "0"));
                    }
                    SqlParameters.Add(new SqlParameter("Status", ddlStatus.SelectedValue));
                    SqlParameters.Add(new SqlParameter("ApplicationDetailID", Convert.ToInt32(hdnID.Value)));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                {
                    GridApplicationDetails.DataBind();
                    divGrid.Visible = true;
                    divForm.Visible = false;
                    ErrorDisplay.ShowAlertMessage("Successfully Completed.");
                }
                else
                {
                    ErrorDisplay.ShowAlertMessage("Something wen't wrong please try agian later.");
                }
            }
            else
            {
                string ErrorIfAny = String.Empty;
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "CreateApplicationDetails @ItemText,@ItemCode,@Type,@ItemFileURL,@Amount,@AmountOrPercentage,@IsLoanFee,@Status";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ItemText", txtName.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("ItemCode", txtCode.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("Type", ddlType.SelectedValue));
                    if (ddlType.SelectedValue == "1")
                    {
                        SqlParameters.Add(new SqlParameter("ItemFileURL", ""));
                        SqlParameters.Add(new SqlParameter("Amount", txtItemAmount.Text.Trim()));
                        SqlParameters.Add(new SqlParameter("AmountOrPercentage", rblAmountOrPercentage.SelectedValue));
                        SqlParameters.Add(new SqlParameter("IsLoanFee", IsLoanFee));
                    }
                    else
                    {
                        SqlParameters.Add(new SqlParameter("ItemFileURL", Session["itemPath"]));
                        SqlParameters.Add(new SqlParameter("Amount", ""));
                        SqlParameters.Add(new SqlParameter("AmountOrPercentage", "-1"));
                        SqlParameters.Add(new SqlParameter("IsLoanFee", "0"));
                    }
                    SqlParameters.Add(new SqlParameter("Status", ddlStatus.SelectedValue));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                {
                    GridApplicationDetails.DataBind();
                    divGrid.Visible = true;
                    divForm.Visible = false;
                    ErrorDisplay.ShowAlertMessage("Successfully Completed.");
                }
                else
                {
                    ErrorDisplay.ShowAlertMessage("Something wen't wrong please try agian later.");
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        try
        {
            ddlType.DataBind();
            GridApplicationDetails.DataBind();
            divGrid.Visible = true;
            divForm.Visible = false;
            txtItemAmount.Text = String.Empty;
            txtCode.Text = String.Empty;
            txtName.Text = String.Empty;
            lblCurrentFileURL.Text = String.Empty;
            rblAmountOrPercentage.DataBind();
        }
        catch (Exception eX) { }
    }

    protected void ddlType_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            if (ddlType.SelectedValue == "1")
            {
                divFeeType.Visible = true;
                divAmountOrPercentage.Visible = true;
                divFileType.Visible = false;
                divIsLoanFee.Visible = true;
            }
            else if (ddlType.SelectedValue == "2" || ddlType.SelectedValue == "3")
            {
                divFeeType.Visible = false;
                divAmountOrPercentage.Visible = false;
                divFileType.Visible = true;
                divIsLoanFee.Visible = false;
            }
            else
            {
                divFeeType.Visible = false;
                divAmountOrPercentage.Visible = false;
                divFileType.Visible = false;
                divIsLoanFee.Visible = false;
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCreateNew_Click(object sender, EventArgs e)
    {
        divGrid.Visible = false;
        divForm.Visible = true;
        divAmountOrPercentage.Visible = false;
        hdnID.Value = "-1";
        txtItemAmount.Text = String.Empty;
        txtCode.Text = String.Empty;
        txtName.Text = String.Empty;
        lblCurrentFileURL.Text = String.Empty;
        rblAmountOrPercentage.DataBind();
    }
}