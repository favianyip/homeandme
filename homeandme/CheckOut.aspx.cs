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

public partial class CheckOut : System.Web.UI.Page
{
    string ProjectID = String.Empty;
    string ErrorIfAny = String.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            if (Session["ProjectID"] != null)
            {
                ProjectID = Session["ProjectID"].ToString();
            }
            if (!IsPostBack)
            {
                GetProjectDetails(ProjectID);
            }
            else
            {
                HdnLoanAmount.Value = txtLoanAmount.Text;
                if (chkIsLoan.Checked)
                {
                    DivLoan.Visible = true;
                }
                else
                {
                    DivLoan.Visible = false;
                }
            }
            GetBanks();
            GetDocuments();
            GetProjectCost();
        }
        catch (Exception ex) { }
    }

    public void GetBanks()
    {
        string ErrorIfAny = string.Empty;
        DataSet DS = new DataSet();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT DISTINCT ApplicationDetailID,ItemText, ItemFileURL FROM ApplicationDetails WHERE ApplicationDetails.[Status] = 1 AND ApplicationDetails.[Type] = 2";
            SQLCommands.Add(SQLContainer);
        }
        if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny)) { }
        else
        {
            rptbanks.DataSource = DS;
            rptbanks.DataBind();
        }
    }

    public void GetDocuments()
    {
        string ErrorIfAny = string.Empty;
        DataSet DS = new DataSet();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT DISTINCT ApplicationDetailID,ItemText, ItemFileURL FROM ApplicationDetails WHERE ApplicationDetails.[Status] = 1 AND ApplicationDetails.[Type] = 3";
            SQLCommands.Add(SQLContainer);
        }
        if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny)) { }
        else
        {
            rptDocuments.DataSource = DS;
            rptDocuments.DataBind();
        }
    }

    public void GetProjectCost()
    {
        string ErrorIfAny = string.Empty;
        DataSet DS = new DataSet();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT ProjectCost FROM Projects WHERE ProjectID = @ProjectID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny)) { }
        else
        {
            lblTotalProjectCost.Text = Tools.FormatMoneyWithDecimal(DS.Tables[0].Rows[0]["ProjectCost"].ToString());
        }
    }

    void GetProjectDetails(string ProjectID)
    {
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "GetProjectDetails @ProjectID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                txtSiteAdddressName.Text = ds.Tables[0].Rows[0]["SiteAddressName"].ToString();
                txtSiteAddressMobile.Text = ds.Tables[0].Rows[0]["SiteAddressMobile"].ToString();
                txtSiteAddressZipCode.Text = ds.Tables[0].Rows[0]["SitePostalcode"].ToString();
                txtSiteAddress1.Text = ds.Tables[0].Rows[0]["SiteAddress1"].ToString();
                txtSiteAddress2.Text = ds.Tables[0].Rows[0]["SiteAddress2"].ToString();
                txtSiteAddressState.Text = ds.Tables[0].Rows[0]["SiteAddressState"].ToString();
                txtSiteAddressCountry.Text = ds.Tables[0].Rows[0]["SiteAddressCountry"].ToString();
                txtBillingAddressName.Text = ds.Tables[0].Rows[0]["BillingAddressName"].ToString();
                txtBillingAddressMobile.Text = ds.Tables[0].Rows[0]["BillingAddressMobile"].ToString();
                txtBillingAddressZipCode.Text = ds.Tables[0].Rows[0]["BillingAddressPostCode"].ToString();
                txtBillingAddress1.Text = ds.Tables[0].Rows[0]["BillingAddress1"].ToString();
                txtBillingAddress2.Text = ds.Tables[0].Rows[0]["BillingAddress2"].ToString();
                txtBillingAddressState.Text = ds.Tables[0].Rows[0]["BillingAddressState"].ToString();
                txtBillingAddressCountry.Text = ds.Tables[0].Rows[0]["BillingAddressCountry"].ToString();

                if (ds.Tables[0].Rows[0]["IsBankLoan"].ToString() == "")
                {
                    chkNoLoan.Checked = false;
                    chkIsLoan.Checked = true;
                    DivLoan.Visible = true;
                    txtLoanAmount.Text = "1000";
                    LoanAmountTrackBar.Value = "1000";
                }
                else if (ds.Tables[0].Rows[0]["IsBankLoan"].ToString() == "0")
                {
                    chkNoLoan.Checked = true;
                    chkIsLoan.Checked = false;
                    DivLoan.Visible = false;
                    txtLoanAmount.Text = "1000";
                    LoanAmountTrackBar.Value = "1000";
                }
                else
                {
                    chkNoLoan.Checked = false;
                    chkIsLoan.Checked = true;
                    DivLoan.Visible = true;
                    txtLoanAmount.Text = ds.Tables[0].Rows[0]["BankLoanAmount"].ToString();
                    LoanAmountTrackBar.Value = ds.Tables[0].Rows[0]["BankLoanAmount"].ToString();
                }
                if (ds.Tables[0].Rows[0]["UserRequestedDateForPartner"].ToString() != "")
                {
                    DivDateValue.Visible = true;
                    DivDateSelect.Visible = false;
                    lblRequestedDate.Text = Convert.ToDateTime(ds.Tables[0].Rows[0]["UserRequestedDateForPartner"]).ToString("dd MMMM yyyy");
                    lblRequestedTime.Text = Convert.ToDateTime(ds.Tables[0].Rows[0]["UserRequestedDateForPartner"]).ToString("hh:mm tt");
                    DtDate.Value = Convert.ToDateTime(ds.Tables[0].Rows[0]["UserRequestedDateForPartner"].ToString());
                }
                else
                {
                    DivDateValue.Visible = false;
                    DivDateSelect.Visible = true;
                    DtDate.Value = null;
                    DtDate.NullText = "SELECT DATE AND TIME";
                }
                if (ds.Tables[0].Rows[0]["FloorPlanPath"].ToString() != "")
                {
                    lblFloorPlanFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["FloorPlanPath"].ToString());
                }
                else
                {
                    lblFloorPlanFile.Text = String.Empty;
                }
                if (ds.Tables[0].Rows[0]["PermitPath"].ToString() != "")
                {
                    lblRenovationPermitFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["PermitPath"].ToString());
                }
                else
                {
                    lblRenovationPermitFile.Text = String.Empty;
                }
                if (ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString() != "")
                {
                    lblIndemnityFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString());
                }
                else
                {
                    lblIndemnityFile.Text = String.Empty;
                }
                Session["FloorPlanPath"] = ds.Tables[0].Rows[0]["FloorPlanPath"].ToString();
                Session["PermitPath"] = ds.Tables[0].Rows[0]["PermitPath"].ToString();
                Session["IndemnityFormPath"] = ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString();
                Session["IsFloorPlanUploaded"] = ds.Tables[0].Rows[0]["IsFloorPlanUploaded"].ToString();
                Session["IsPermitUploaded"] = ds.Tables[0].Rows[0]["IsPermitUploaded"].ToString();
                Session["IsIndemnityFormUploaded"] = ds.Tables[0].Rows[0]["IsIndemnityFormUploaded"].ToString();
            }
        }
    }

    //protected void btnBankForm_Click(object sender, EventArgs e)
    //{
    //    try
    //    {
    //        String file = ((LinkButton)sender).CommandArgument;
    //        string actualFilePath = file;
    //        Response.Redirect(actualFilePath);
    //        //Response.ContentType = "application/pdf";
    //        //string filename = Path.GetFileName(actualFilePath);
    //        //String Header = "Attachment; Filename=" + filename;
    //        //Response.AppendHeader("Content-Disposition", Header);
    //        //actualFilePath = Server.MapPath("/UploadedFiles/ApplicationForms/" + filename);
    //        //Response.TransmitFile(actualFilePath);
    //        //Response.End();
    //    }
    //    catch (Exception ex) { }
    //}

    protected void chkIsSameAddress_CheckedChanged(object sender, EventArgs e)
    {
        try
        {
            if (chkIsSameAddress.Checked == true)
            {
                txtBillingAddressName.Text = txtSiteAdddressName.Text;
                txtBillingAddressMobile.Text = txtSiteAddressMobile.Text;
                txtBillingAddressZipCode.Text = txtSiteAddressZipCode.Text;
                txtBillingAddress1.Text = txtSiteAddress1.Text;
                txtBillingAddress2.Text = txtSiteAddress2.Text;
                txtBillingAddressState.Text = txtSiteAddressState.Text;
                txtBillingAddressCountry.Text = txtSiteAddressCountry.Text;
            }
            else
            {
                txtBillingAddressName.Text = String.Empty;
                txtBillingAddressMobile.Text = String.Empty;
                txtBillingAddressZipCode.Text = String.Empty;
                txtBillingAddress1.Text = String.Empty;
                txtBillingAddress2.Text = String.Empty;
                txtBillingAddressState.Text = String.Empty;
                txtBillingAddressCountry.Text = String.Empty;
            }
        }
        catch (Exception ex) { }
    }

    //protected void lnkDocumentForm_Click(object sender, EventArgs e)
    //{
    //    try
    //    {
    //        String file = ((LinkButton)sender).CommandArgument;
    //        string actualFilePath = file;
    //        Response.ContentType = "application/pdf";
    //        string filename = Path.GetFileName(actualFilePath);
    //        String Header = "Attachment; Filename=" + filename;
    //        Response.AppendHeader("Content-Disposition", Header);
    //        actualFilePath = Server.MapPath("/UploadedFiles/ApplicationForms/" + filename);
    //        Response.TransmitFile(actualFilePath);
    //        Response.End();
    //    }
    //    catch (Exception ex) { }
    //}

    protected void lnkProceed_Click(object sender, EventArgs e)
    {
        try
        {
            string BankLoanAMount = String.Empty;
            int IsBankLoan = 0;
            if (chkIsLoan.Checked)
            {
                IsBankLoan = 1;
                BankLoanAMount = txtLoanAmount.Text.Trim();
            }
            else
            {
                IsBankLoan = 0;
                BankLoanAMount = String.Empty;
            }

            if (Convert.ToDateTime(DtDate.Value) < DateTime.Now)
            {
                lblDateMsg.Text = "Please select proper date and time!";
            }
            else
            {
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "SaveCheckOutDetailsForProject @ProjectID, @SiteAddressName, @SiteAddressMobile, @SiteAddressZipCode, @SiteAddress1, @SiteAddress2," +
                                         "@SiteAddressState, @SiteAddressCountry, @BillingAddressName, @BillingAddressMobile, @BillingAddressZipCode, @BillingAddress1," +
                                         "@BillingAddress2, @BillingAddressState, @BillingAddressCountry, @IsBankLoan, @BankLoanAmount";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                    SqlParameters.Add(new SqlParameter("SiteAddressName", txtSiteAdddressName.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("SiteAddressMobile", txtSiteAddressMobile.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("SiteAddressZipCode", txtSiteAddressZipCode.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("SiteAddress1", txtSiteAddress1.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("SiteAddress2", txtSiteAddress2.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("SiteAddressState", txtSiteAddressState.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("SiteAddressCountry", txtSiteAddressCountry.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("BillingAddressName", txtBillingAddressName.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("BillingAddressMobile", txtBillingAddressMobile.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("BillingAddressZipCode", txtBillingAddressZipCode.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("BillingAddress1", txtBillingAddress1.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("BillingAddress2", txtBillingAddress2.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("BillingAddressState", txtBillingAddressState.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("BillingAddressCountry", txtBillingAddressCountry.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("IsBankLoan", IsBankLoan));
                    SqlParameters.Add(new SqlParameter("BankLoanAmount", BankLoanAMount));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                {
                    if (Session["UserID"] != null && Session["UserID"] != "")
                    {
                        SaveUserForProject(Session["UserID"].ToString());
                        Response.Redirect("/MyProject.aspx");
                    }
                    else
                    {
                        Response.Redirect("/Login.aspx");
                    }
                }
            }
        }
        catch (Exception ex) { }
    }

    void SaveUserForProject(string UserID)
    {
        try
        {
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UPDATE Projects SET UserID = @UserID WHERE ProjectID = @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("UserID", UserID));
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            Tools.GetData(SQLCommands, out ds, out ErrorIfAny);
        }
        catch (Exception ex) { }
    }

    protected void LoanAmountTrackBar_PositionChanged(object sender, EventArgs e)
    {
        try
        {
            txtLoanAmount.Text = LoanAmountTrackBar.Value.ToString();
        }
        catch (Exception ex) { }
    }

    protected void txtLoanAmount_TextChanged(object sender, EventArgs e)
    {
        try
        {
            LoanAmountTrackBar.Value = HdnLoanAmount.Value;
            txtLoanAmount.Text = LoanAmountTrackBar.Value.ToString();
        }
        catch (Exception ex) { }
    }

    protected void DtDate_DateChanged(object sender, EventArgs e)
    {
        try
        {
            if (Convert.ToDateTime(DtDate.Value) < DateTime.Now)
            {
                lblDateMsg.Text = "Please select proper date and time!";
            }
            else
            {
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "UPDATE Projects SET UserRequestedDateForPartner = @RequestedDate WHERE ProjectID = @ProjectID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                    SqlParameters.Add(new SqlParameter("RequestedDate", DtDate.Value));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                {
                    DivDateSelect.Visible = false;
                    DivDateValue.Visible = true;
                    lblDateMsg.Text = "";
                    lblRequestedDate.Text = DtDate.Date.ToString("dd MMMM yyyy");
                    lblRequestedTime.Text = DtDate.Date.ToString("hh:mm tt");
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void DateEdit_Click(object sender, EventArgs e)
    {
        try
        {
            DivDateSelect.Visible = true;
            DivDateValue.Visible = false;
        }
        catch (Exception ex) { }
    }

    protected void chkIsLoan_CheckedChanged(object sender, EventArgs e)
    {
        try
        {
            chkNoLoan.Checked = false;
            DivLoan.Visible = true;
        }
        catch (Exception ex) { }
    }

    protected void chkNoLoan_CheckedChanged(object sender, EventArgs e)
    {
        try
        {
            chkIsLoan.Checked = false;
            DivLoan.Visible = false;
        }
        catch (Exception ex) { }
    }

    protected void lnkSaveFiles_Click(object sender, EventArgs e)
    {
        try
        {
            string FloorPlanPath = String.Empty;
            string RenovationPermitPath = String.Empty;
            string IndemnityPath = String.Empty;
            int IsFloorPlanUploaded = 0;
            int IsRenovationPermitUploaded = 0;
            int IsIndemnityUploaded = 0;
            string OriginalFileName = String.Empty;
            string[] ExtensionArray = new string[0];

            if (FloorPlanUpload.HasFile)
            {
                FileInfo FileName = new FileInfo(FloorPlanUpload.PostedFile.FileName);
                OriginalFileName = FileName.ToString();
                ExtensionArray = OriginalFileName.Split('.');
                OriginalFileName = ExtensionArray[0] + "_" + DateTime.Now.ToString("yyyyMMddHHmmss") + "." + ExtensionArray[ExtensionArray.Length - 1];
                FloorPlanUpload.SaveAs(Server.MapPath("/UploadedFiles/FloorPlan/") + OriginalFileName);
                FloorPlanPath = ConfigurationManager.AppSettings["BaseUrl"] + "FloorPlan/" + OriginalFileName;
                Session["FloorPlanPath"] = FloorPlanPath;
                IsFloorPlanUploaded = 1;
                Session["IsFloorPlanUploaded"] = IsFloorPlanUploaded;
            }
            if (RenovationPermitUpload.HasFile)
            {
                FileInfo FileName = new FileInfo(RenovationPermitUpload.PostedFile.FileName);
                OriginalFileName = FileName.ToString();
                ExtensionArray = OriginalFileName.Split('.');
                OriginalFileName = ExtensionArray[0] + "_" + DateTime.Now.ToString("yyyyMMddHHmmss") + "." + ExtensionArray[ExtensionArray.Length - 1];
                RenovationPermitUpload.SaveAs(Server.MapPath("/UploadedFiles/RenovationPermit/") + OriginalFileName);
                RenovationPermitPath = ConfigurationManager.AppSettings["BaseUrl"] + "RenovationPermit/" + OriginalFileName;
                Session["PermitPath"] = RenovationPermitPath;
                IsRenovationPermitUploaded = 1;
                Session["IsPermitUploaded"] = IsRenovationPermitUploaded;
            }
            if (IndemnityFileUpload.HasFile)
            {
                FileInfo FileName = new FileInfo(IndemnityFileUpload.PostedFile.FileName);
                OriginalFileName = FileName.ToString();
                ExtensionArray = OriginalFileName.Split('.');
                OriginalFileName = ExtensionArray[0] + "_" + DateTime.Now.ToString("yyyyMMddHHmmss") + "." + ExtensionArray[ExtensionArray.Length - 1];
                IndemnityFileUpload.SaveAs(Server.MapPath("/UploadedFiles/Indemnity/") + OriginalFileName);
                IndemnityPath = ConfigurationManager.AppSettings["BaseUrl"] + "Indemnity/" + OriginalFileName;
                Session["IndemnityFormPath"] = IndemnityPath;
                IsIndemnityUploaded = 1;
                Session["IsIndemnityFormUploaded"] = IsIndemnityUploaded;
            }

            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SaveUploadDocumentsForProject @ProjectID, @IsFloorPlanUploaded, @IsRenovationPermitUploaded, @IsIndemnityUploaded," +
                                     "@FloorPlanPath, @RenovationPermitPath, @IndemnityFormPath";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SqlParameters.Add(new SqlParameter("IsFloorPlanUploaded", Session["IsFloorPlanUploaded"]));
                SqlParameters.Add(new SqlParameter("IsRenovationPermitUploaded", Session["IsPermitUploaded"]));
                SqlParameters.Add(new SqlParameter("IsIndemnityUploaded", Session["IsIndemnityFormUploaded"]));
                SqlParameters.Add(new SqlParameter("FloorPlanPath", Session["FloorPlanPath"]));
                SqlParameters.Add(new SqlParameter("RenovationPermitPath", Session["PermitPath"]));
                SqlParameters.Add(new SqlParameter("IndemnityFormPath", Session["IndemnityFormPath"]));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                GetProjectDocumentDetails(ProjectID);
            }
        }
        catch (Exception ex) { }
    }

    void GetProjectDocumentDetails(string ProjectID)
    {
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "GetProjectDetails @ProjectID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                if (ds.Tables[0].Rows[0]["FloorPlanPath"].ToString() != "")
                {
                    lblFloorPlanFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["FloorPlanPath"].ToString());
                }
                else
                {
                    lblFloorPlanFile.Text = String.Empty;
                }
                if (ds.Tables[0].Rows[0]["PermitPath"].ToString() != "")
                {
                    lblRenovationPermitFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["PermitPath"].ToString());
                }
                else
                {
                    lblRenovationPermitFile.Text = String.Empty;
                }
                if (ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString() != "")
                {
                    lblIndemnityFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString());
                }
                else
                {
                    lblIndemnityFile.Text = String.Empty;
                }
                Session["FloorPlanPath"] = ds.Tables[0].Rows[0]["FloorPlanPath"].ToString();
                Session["PermitPath"] = ds.Tables[0].Rows[0]["PermitPath"].ToString();
                Session["IndemnityFormPath"] = ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString();
                Session["IsFloorPlanUploaded"] = ds.Tables[0].Rows[0]["IsFloorPlanUploaded"].ToString();
                Session["IsPermitUploaded"] = ds.Tables[0].Rows[0]["IsPermitUploaded"].ToString();
                Session["IsIndemnityFormUploaded"] = ds.Tables[0].Rows[0]["IsIndemnityFormUploaded"].ToString();
            }
        }
    }
}