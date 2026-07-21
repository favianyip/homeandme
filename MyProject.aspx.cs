using Stripe;
using Stripe.Checkout;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using DevExpress.Web;
using iTextSharp.text;
using iTextSharp.text.html.simpleparser;
using iTextSharp.text.pdf;
using PayPal.Api;
using PaypalPaymentIntegration;
using System.Collections;
public partial class MyProject : System.Web.UI.Page
{
    string ProjectID = String.Empty;
    string ErrorIfAny = String.Empty;
    public string sessionId = "";
    string price = string.Empty;
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
                GetRooms(ProjectID);
                GetTotalRoomCost(ProjectID);
                GetProjectCostDetails(ProjectID);
                GetRoomDetails(ProjectID);
            }
            if (Session["EditRoomID"] != null)
            {
                Session["EditRoomID"] = null;
            }
        }
        catch (Exception ex) { }
    }

    void UpdatePermitFeeRequired()
    {
        try
        {
            Tools.ExecuteSQL_DML("UPDATE Projects SET IsPermitFeeRequired = 1 WHERE ProjectID =" + ProjectID, true);
        }
        catch (Exception eX) { }
    }

    void GetProjectDetails(string ProjectID)
    {
        try
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
                    lblSiteAddressName.Text = ds.Tables[0].Rows[0]["SiteAddressName"].ToString();
                    lblSiteAddressMobile.Text = ds.Tables[0].Rows[0]["SiteAddressMobile"].ToString();
                    lblSiteAddressPostalCode.Text = ds.Tables[0].Rows[0]["SitePostalcode"].ToString();
                    lblSiteAddress1.Text = ds.Tables[0].Rows[0]["SiteAddress1"].ToString();
                    if (ds.Tables[0].Rows[0]["SiteAddress2"].ToString() != "")
                    {
                        lblSiteAddress1.Text = lblSiteAddress1.Text + "," + ds.Tables[0].Rows[0]["SiteAddress2"].ToString();
                    }
                    lblSiteAddressState.Text = ds.Tables[0].Rows[0]["SiteAddressState"].ToString();
                    lblSiteAddressCountry.Text = ds.Tables[0].Rows[0]["SiteAddressCountry"].ToString();

                    lblBillingAddressName.Text = ds.Tables[0].Rows[0]["BillingAddressName"].ToString();
                    lblBillingAddressMobile.Text = ds.Tables[0].Rows[0]["BillingAddressMobile"].ToString();
                    lblBillingAddressPostalCode.Text = ds.Tables[0].Rows[0]["BillingAddressPostCode"].ToString();
                    lblBillingAddress1.Text = ds.Tables[0].Rows[0]["BillingAddress1"].ToString();
                    if (ds.Tables[0].Rows[0]["BillingAddress2"].ToString() != "")
                    {
                        lblBillingAddress1.Text = lblBillingAddress1.Text + "," + ds.Tables[0].Rows[0]["BillingAddress2"].ToString();
                    }
                    lblBillingAddressState.Text = ds.Tables[0].Rows[0]["BillingAddressState"].ToString();
                    lblBillingAddressCountry.Text = ds.Tables[0].Rows[0]["BillingAddressCountry"].ToString();

                    lblPropertyType.Text = ds.Tables[0].Rows[0]["PropertyType"].ToString();
                    lblFlatType.Text = ds.Tables[0].Rows[0]["ProjectFlatType"].ToString();

                    if (ds.Tables[0].Rows[0]["FloorPlanPath"].ToString() != "")
                    {
                        DivFloorPlanForm.Attributes.Add("class", "hnm-my-project__doc-box");
                        lblFloorPlanForm.Text = "Colour floor plan";
                        ImgFloorPlanForm.ImageUrl = "~/assets/images/tick-icon.svg";
                        DivDwldFloorPlan.Visible = true;
                        lblFloorPlanFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["FloorPlanPath"].ToString());
                        lnkDwnldFloorPlan.CommandArgument = ds.Tables[0].Rows[0]["FloorPlanPath"].ToString();
                    }
                    else
                    {
                        DivFloorPlanForm.Attributes.Add("class", "hnm-my-project__doc-box hnm-my-project__doc-box--red");
                        lblFloorPlanForm.Text = "Floor plan pending";
                        ImgFloorPlanForm.ImageUrl = "~/assets/images/pending-icon.svg";
                        DivDwldFloorPlan.Visible = false;
                        lblFloorPlanFile.Text = String.Empty;
                        lnkDwnldFloorPlan.CommandArgument = "";
                    }
                    if (ds.Tables[0].Rows[0]["PermitPath"].ToString() != "")
                    {
                        DivPermitForm.Attributes.Add("class", "hnm-my-project__doc-box");
                        lblPermitForm.Text = "Permit form";
                        ImgPermitForm.ImageUrl = "~/assets/images/tick-icon.svg";
                        DivDwldPermit.Visible = true;
                        lblRenovationPermitFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["PermitPath"].ToString());
                        lnkDwnldPermit.CommandArgument = ds.Tables[0].Rows[0]["PermitPath"].ToString();
                    }
                    else
                    {
                        DivPermitForm.Attributes.Add("class", "hnm-my-project__doc-box hnm-my-project__doc-box--red");
                        lblPermitForm.Text = "Permit form pending";
                        ImgPermitForm.ImageUrl = "~/assets/images/pending-icon.svg";
                        DivDwldPermit.Visible = false;
                        lblRenovationPermitFile.Text = String.Empty;
                        lnkDwnldPermit.CommandArgument = "";
                    }
                    if (ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString() != "")
                    {
                        DivIndemnityForm.Attributes.Add("class", "hnm-my-project__doc-box");
                        lblIndemnityForm.Text = "Indemnity form";
                        ImgIndemnityForm.ImageUrl = "~/assets/images/tick-icon.svg";
                        DivDwldIndemnity.Visible = true;
                        lblIndemnityFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString());
                        lnkDwnldIndemnity.CommandArgument = ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString();
                    }
                    else
                    {
                        DivIndemnityForm.Attributes.Add("class", "hnm-my-project__doc-box hnm-my-project__doc-box--red");
                        lblIndemnityForm.Text = "Indemnity pending";
                        ImgIndemnityForm.ImageUrl = "~/assets/images/pending-icon.svg";
                        DivDwldIndemnity.Visible = false;
                        lblIndemnityFile.Text = String.Empty;
                        lnkDwnldIndemnity.CommandArgument = "";
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
        catch (Exception ex) { }
    }

    void GetRooms(string ProjectID)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetRoomPreferences @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                rptRoomPreferences.DataSource = DS;
                rptRoomPreferences.DataBind();
            }
        }
        catch (Exception ex) { }
    }

    void GetRoomDetails(string ProjectID)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetRoomDetailsForProject @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                divProjectDetailsEdit.Visible = true;
                divProjectDetails.Visible = true;
                if (DS.Tables[0].Rows.Count > 0)
                {
                    rptRoomDetails.DataSource = DS;
                    rptRoomDetails.DataBind();
                }
                else
                {
                    divProjectDetailsEdit.Visible = false;
                    divProjectDetails.Visible = false;
                }
            }
        }
        catch (Exception ex) { }
    }

    void GetRoomConfigurationDetails(string ProjectID)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetRoomDetailsForProject @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                divProjectDetailsEdit.Visible = true;
                divProjectDetails.Visible = true;
                if (DS.Tables[0].Rows.Count > 0)
                {
                    rptRoomDetails.DataSource = DS;
                    rptRoomDetails.DataBind();
                }
                else
                {
                    divProjectDetailsEdit.Visible = false;
                    divProjectDetails.Visible = false;
                }
            }
        }
        catch (Exception ex) { }
    }

    void GetTotalRoomCost(string ProjectID)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetTotalRoomCost @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                lblTotalAmount.Text = Tools.FormatMoneyWithDecimal(DS.Tables[0].Rows[0]["TotalRate"].ToString());
            }
        }
        catch (Exception ex) { }
    }

    string GetProjectCostDetails(string ProjectID)
    {
        decimal RenovationCost = 0;
        decimal LoanProcessingFee = 0;
        decimal AdministrationFee = 0;
        decimal PermitApplicationFee = 0;
        decimal OverllAllProjectCost = 0;
        string PaymentCost = String.Empty;

        LoanProcessingFee = Convert.ToDecimal(Tools.GetConfigValue("LoanProcessingFee"));
        AdministrationFee = Convert.ToDecimal(Tools.GetConfigValue("AdministrationFee"));
        PermitApplicationFee = Convert.ToDecimal(Tools.GetConfigValue("PermitApplicationFee"));

        DataSet DS = new DataSet();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "GetProjectCostDetails @ProjectID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
        {
            throw new Exception(ErrorIfAny);
        }
        else
        {
            LoanProcessingFee = Convert.ToInt32(DS.Tables[0].Rows[0]["LoanProcessingFee"]);
            PermitApplicationFee = Convert.ToInt32(DS.Tables[0].Rows[0]["PermitApplicationFee"]);
            AdministrationFee = Convert.ToInt32(DS.Tables[0].Rows[0]["AdministrationFee"]);
            if (DS.Tables[0].Rows[0]["TotalProjectCost"].ToString() != "")
            {
                RenovationCost = Convert.ToDecimal(DS.Tables[0].Rows[0]["TotalProjectCost"].ToString());
            }
            if (DS.Tables[0].Rows[0]["IsBankLoan"].ToString() != "")
            {
                if (DS.Tables[0].Rows[0]["IsBankLoan"].ToString() == "0")
                {
                    LoanProcessingFee = 0;
                }
            }
            else
            {
                LoanProcessingFee = 0;
            }
            if (DS.Tables[0].Rows[0]["IsPermitFeeRequired"].ToString() == "0")
            {
                PermitApplicationFee = 0;
            }
            if (DS.Tables[1].Rows.Count > 0)
            {
                rptProjectFees.DataSource = DS.Tables[1];
                rptProjectFees.DataBind();
            }
            lblInitialPyamentCost.Text = Convert.ToString((RenovationCost * 10 / 100));
            lblRenovationCost.Text = RenovationCost.ToString("#,##0");
            decimal TotalFormFee = Convert.ToInt32(DS.Tables[2].Rows[0]["TotalFormFee"]);
            OverllAllProjectCost = RenovationCost + TotalFormFee;
            lblTotalProjectCost.Text = OverllAllProjectCost.ToString("#,##0");
            lblTotalPayable.Text = (RenovationCost * 10 / 100).ToString("0.00"); //ToString("#,##0");
            PaymentCost = OverllAllProjectCost.ToString();
        }
        return PaymentCost;
    }

    protected void lnkAddRooms_Click(object sender, EventArgs e)
    {
        try
        {
            Response.Redirect("/CustomizeYourRoom.aspx");
        }
        catch (Exception ex) { }
    }

    protected void btnSaveFiles_Click(object sender, EventArgs e)
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
                GetProjectDetails(ProjectID);
                lnkClosePopUp_Click(sender, e);
            }
        }
        catch (Exception ex) { }
    }

    protected void lnkDwnldFloorPlan_Click(object sender, EventArgs e)
    {
        try
        {
            String file = ((LinkButton)sender).CommandArgument;
            string actualFilePath = file;
            Response.ContentType = "application/pdf";
            string filename = Path.GetFileName(actualFilePath);
            String Header = "Attachment; Filename=" + filename;
            Response.AppendHeader("Content-Disposition", Header);
            actualFilePath = Server.MapPath("/UploadedFiles/FloorPlan/" + filename);
            Response.TransmitFile(actualFilePath);
            Response.End();
        }
        catch (Exception ex) { }
    }

    protected void lnkDwnldPermit_Click(object sender, EventArgs e)
    {
        try
        {
            String file = ((LinkButton)sender).CommandArgument;
            string actualFilePath = file;
            Response.ContentType = "application/pdf";
            string filename = Path.GetFileName(actualFilePath);
            String Header = "Attachment; Filename=" + filename;
            Response.AppendHeader("Content-Disposition", Header);
            actualFilePath = Server.MapPath("/UploadedFiles/RenovationPermit/" + filename);
            Response.TransmitFile(actualFilePath);
            Response.End();
        }
        catch (Exception ex) { }
    }

    protected void lnkDwnldIndemnity_Click(object sender, EventArgs e)
    {
        try
        {
            String file = ((LinkButton)sender).CommandArgument;
            string actualFilePath = file;
            Response.ContentType = "application/pdf";
            string filename = Path.GetFileName(actualFilePath);
            String Header = "Attachment; Filename=" + filename;
            Response.AppendHeader("Content-Disposition", Header);
            actualFilePath = Server.MapPath("/UploadedFiles/Indemnity/" + filename);
            Response.TransmitFile(actualFilePath);
            Response.End();
        }
        catch (Exception ex) { }
    }

    protected void lnkUploadDocuments_Click(object sender, EventArgs e)
    {
        try
        {
            uploadPendingModal.Style.Add("padding-right", "17px");
            uploadPendingModal.Style.Add("display", "block");
            uploadPendingModal.Attributes.Add("class", "modal fade hnm-modal hnm-modal--upload-docs show");
            HtmlGenericControl body = (HtmlGenericControl)Master.FindControl("MasterBody");
            body.Attributes.Add("class", "modal-open");
            body.Style.Add("padding-right", "17px");
            ((Literal)Master.FindControl("LitDivPopUp")).Text = "<div class='modal-backdrop fade show'></div>";
        }
        catch (Exception ex) { }
    }

    protected void btnCancelFiles_Click(object sender, EventArgs e)
    {
        try
        {
            uploadPendingModal.Style.Remove("padding-right");
            uploadPendingModal.Style.Remove("display");
            uploadPendingModal.Attributes.Add("class", "modal fade hnm-modal hnm-modal--upload-docs");
            HtmlGenericControl body = (HtmlGenericControl)Master.FindControl("MasterBody");
            body.Attributes.Remove("class");
            body.Style.Remove("padding-right");
            ((Literal)Master.FindControl("LitDivPopUp")).Text = "";
        }
        catch (Exception ex) { }
    }

    protected void lnkDeleteRoom_Click(object sender, EventArgs e)
    {
        try
        {
            string RoomPreferenceID = ((LinkButton)sender).CommandArgument;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "RemoveProjectRooms @RoomPreferenceID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("RoomPreferenceID", RoomPreferenceID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                GetRooms(ProjectID);
                GetTotalRoomCost(ProjectID);
                GetProjectCostDetails(ProjectID);
                GetRoomDetails(ProjectID);
            }
        }
        catch (Exception ex) { }
    }

    protected void lnkClosePopUp_Click(object sender, EventArgs e)
    {
        try
        {
            uploadPendingModal.Style.Remove("padding-right");
            uploadPendingModal.Style.Remove("display");
            uploadPendingModal.Attributes.Add("class", "modal fade hnm-modal hnm-modal--upload-docs");
            HtmlGenericControl body = (HtmlGenericControl)Master.FindControl("MasterBody");
            body.Attributes.Remove("class");
            body.Style.Remove("padding-right");
            ((Literal)Master.FindControl("LitDivPopUp")).Text = "";
        }
        catch (Exception ex) { }
    }

    protected void lnkAgreedProceed_Click(object sender, EventArgs e)
    {
        try
        {
            string PaymentCost2 = GetProjectCostDetails(ProjectID);
            string PaymentCost = lblInitialPyamentCost.Text;
            int paymentId = 0;

            price = PaymentCost;
            if (rdoPaypal.Checked)
            {
                Session["PaymentSucess"] = "true";
                string paymentCost = PaymentCost.ToString();
                Session["projectOverallCost"] = PaymentCost.ToString();
                Session["payAfterConfirmation"] = PaymentCost.ToString();
                System.Text.StringBuilder sb = new System.Text.StringBuilder();
                string code = "SG";
                DataSet ds = new DataSet("ds");
                sb.Append("Sale");
                sb.Append("&SHIPTOCOUNTRYCODE=");
                sb.Append(code);
                sb.Append("&L_AMT0=");
                sb.Append(paymentCost);
                sb.Append("&L_QTY0=");
                sb.Append(1);
                PaymentWithPaypal();
                string url = Session["paypalurl"].ToString();
                Response.Redirect(url);
            }
            else if (rdoStripe.Checked)
            {
                decimal pCost = Convert.ToDecimal(PaymentCost);
                if(pCost > 10000)
                {
                    ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "openStripePayMessageModal();", true);
                }
                else
                {
                    Response.Redirect("/ReviewCheckOut.aspx?PaymentCost=" + Convert.ToString(PaymentCost));
                }
            }
            else if (rdoPayNow.Checked)
            {
                paymentId = Tools.InsertPayment(3, Convert.ToDecimal(PaymentCost), Convert.ToInt32(ProjectID.ToString()), 1);
                Tools.ExecuteSQL_DML("UPDATE Projects SET NetPayableCost = " + PaymentCost2 + ", OverAllProjectCost = " + PaymentCost2 + " " +
                                     "WHERE ProjectID =" + ProjectID, true);
                Session["TOPUP_AMOUNT"] = PaymentCost2.ToString();
                Session["PaymentMethod"] = "3";
                Session["PaymentSucess"] = "";
                Session["PAYMENT_ID"] = paymentId;
            }
            else
            {
                ScriptManager.RegisterStartupScript(this.Page, this.GetType(), "script", "openPayMessageModal();", true);
            }
        }
        catch (Exception ex) { }
    }

    protected void lnkEditAddress_Click(object sender, EventArgs e)
    {
        try
        {
            Response.Redirect("/CheckOut.aspx");
        }
        catch (Exception ex) { }
    }

    protected void lnkEditRoomDetails_Click(object sender, EventArgs e)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT TOP 1 RoomID, RoomPreferenceID FROM RoomPreference WHERE ProjectID = @ProjectID AND IsActive = 1";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", Session["ProjectID"]));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                Session["EditRoomID"] = Convert.ToString(DS.Tables[0].Rows[0]["RoomID"]);
                Session["EditRoomPreferenceID"] = Convert.ToString(DS.Tables[0].Rows[0]["RoomPreferenceID"]);
            }
            Response.Redirect("/CustomizeYourRoom.aspx");
        }
        catch (Exception ex) { }
    }

    protected void GridRoomScopes_DetailRowExpandedChanged(object sender, DevExpress.Web.ASPxGridViewDetailRowEventArgs e)
    {
        try
        {
            string[] ary = new string[1];
            ary[0] = "ScopeID";
            int id = e.VisibleIndex;
            Session["ScopeID"] = ((ASPxGridView)sender).GetRowValues(id, ary).ToString().Trim();
        }
        catch (Exception ex) { }
    }

    protected void GridRoomScopes_BeforePerformDataSelect(object sender, EventArgs e)
    {
        try
        {
            Session["ScopeID"] = (sender as ASPxGridView).GetMasterRowKeyValue();
        }
        catch (Exception ex) { }
    }

    protected void GridRoomScopes_PageIndexChanged(object sender, EventArgs e) { }

    protected void GridRoomOptions_BeforePerformDataSelect(object sender, EventArgs e)
    {
        try
        {
            Session["ScopeID"] = (sender as ASPxGridView).GetMasterRowKeyValue();
            ASPxGridView grid = new ASPxGridView();
            grid = ((ASPxGridView)sender);
            updateOrderID(grid);
        }
        catch (Exception ex) { }
    }

    void updateOrderID(ASPxGridView grid)
    {
        try
        {
            if (Session["ScopeID"] == null) { }
        }
        catch (Exception ex) { }
    }

    protected void lnkRemoveItem_Click(object sender, EventArgs e)
    {
        try
        {
            string ScopesInProjectRoomID = ((LinkButton)sender).CommandArgument;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UPDATE Scopes_in_ProjectRooms SET IsActive = 0 WHERE Scopes_in_ProjectRoomID = @ScopesInProjectRoomID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopesInProjectRoomID", ScopesInProjectRoomID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                GetRooms(ProjectID);
                GetTotalRoomCost(ProjectID);
                GetProjectCostDetails(ProjectID);
                GetRoomDetails(ProjectID);
            }
        }
        catch (Exception ex) { }
    }

    protected void chkPermitFee_CheckedChanged(object sender, EventArgs e)
    {
        try { }
        catch (Exception ex) { }
    }

    protected void btnProceedToCheckOut_Click(object sender, EventArgs e)
    {
        try
        {
            string ErrorIfAny = String.Empty;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "CheckProjectRoomSave @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", Session["ProjectID"].ToString()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                if (Convert.ToString(DS.Tables[0].Rows[0]["IsFullySaved"]) == "1")
                {
                    if (rdoStripe.Checked)
                    {
                        Session["PayNow"] = "0";
                        ScriptManager.RegisterStartupScript(this.Page, this.GetType(), "script", "openPayModal();", true);
                    }
                    else if (rdoPaypal.Checked)
                    {
                        Session["PayNow"] = "0";
                        ScriptManager.RegisterStartupScript(this.Page, this.GetType(), "script", "openPayModal();", true);
                    }
                    else if (rdoPayNow.Checked)
                    {
                        lblProjectID.Text = Session["ProjectID"].ToString();
                        ScriptManager.RegisterStartupScript(this.Page, this.GetType(), "script", "openQrModal();", true);
                    }
                    else if (rdoPayNow.Checked)
                    {
                        lblProjectID.Text = Session["ProjectID"].ToString();
                        ScriptManager.RegisterStartupScript(this.Page, this.GetType(), "script", "openQrModal();", true);
                    }
                    else
                    {
                        ScriptManager.RegisterStartupScript(this.Page, this.GetType(), "script", "openPayMessageModal();", true);
                    }
                }
                else
                {
                    ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowAddItemModal();", true);
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void lnkPaynowProceed_Click(object sender, EventArgs e)
    {
        try
        {
            string PaymentCost2 = GetProjectCostDetails(ProjectID);
            string PaymentCost = lblInitialPyamentCost.Text;
            Session["InitialCost"] = PaymentCost;
            Session["PayNow"] = "1";
            int paymentId = 0;
            paymentId = Tools.InsertPayment(3, Convert.ToDecimal(PaymentCost), Convert.ToInt32(ProjectID.ToString()), 1);
            Tools.ExecuteSQL_DML("UPDATE Projects SET NetPayableCost = " + PaymentCost2 + ", OverAllProjectCost = " + PaymentCost2 + " " +
                                 "WHERE ProjectID =" + ProjectID, true);
            Session["TOPUP_AMOUNT"] = PaymentCost2.ToString();
            Session["PaymentMethod"] = "3";
            Session["PaymentSucess"] = "";
            Response.Redirect("/PaymentDetails.aspx");
        }
        catch (Exception eX) { }
    }

    protected void BtnOk_Click(object sender, EventArgs e)
    {
        try
        {
            ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "CloseAddItemModal();", true);
        }
        catch (Exception eX) { }
    }

    private void PaymentWithPaypal(string Cancel = null)
    {
        APIContext apiContext = PaypalConfiguration.GetAPIContext();
        try
        {
            string payerId = Request.Params["PayerID"];
            string AUTH_TYPE = Request.Params["AUTH_TYPE"];
            string AUTH_USER = Request.Params["AUTH_USER"];
            string LOGON_USER = Request.Params["LOGON_USER"];
            string paymentId = Request.Params["paymentId"];
            string token = Request.Params["token"];
            string __RequestVerificationToken = Request.Params["__RequestVerificationToken"];
            if (string.IsNullOrEmpty(payerId))
            {
                string baseURI = Request.Url.Scheme + "://" + Request.Url.Authority +
                            "/SuccessCheckOut.aspx?";
                var guid = Convert.ToString((new Random()).Next(100000));
                var createdPayment = this.CreatePayment(apiContext, baseURI + "guid=" + guid);
                var links = createdPayment.links.GetEnumerator();
                string paypalRedirectUrl = null;

                while (links.MoveNext())
                {
                    Links lnk = links.Current;
                    if (lnk.rel.ToLower().Trim().Equals("approval_url"))
                    {
                        paypalRedirectUrl = lnk.href;
                    }
                }
                Session.Add(guid, createdPayment.id);
                Session["paypalurl"] = paypalRedirectUrl;

            }
            else
            {
                var guid = Request.Params["guid"];
                var executedPayment = ExecutePayment(apiContext, payerId, Session[guid] as string);
                if (executedPayment.state.ToLower() != "approved") { }
            }
        }
        catch (Exception ex)
        {
            Response.Redirect("PaymentUnsuccessful.aspx");
        }
    }

    private PayPal.Api.Payment payment;
    private Payment ExecutePayment(APIContext apiContext, string payerId, string paymentId)
    {
        var paymentExecution = new PaymentExecution() { payer_id = payerId };
        this.payment = new Payment() { id = paymentId };
        return this.payment.Execute(apiContext, paymentExecution);
    }

    private Payment CreatePayment(APIContext apiContext, string redirectUrl)
    {

        ArrayList obj = new ArrayList();
        var itemList = new ItemList() { items = new List<Item>() };
        itemList.items.Add(new Item()
        {
            name = "Item Name comes here",
            currency = "USD",
            price = price,
            quantity = "1",
            sku = "sku"
        });
        obj.Add(itemList);
        var payer = new Payer() { payment_method = "paypal" };
        var redirUrls = new RedirectUrls()
        {
            cancel_url = redirectUrl + "&Cancel=true",
            return_url = redirectUrl
        };
        var details = new Details()
        {
            tax = "0",
            shipping = "0",
            subtotal = price
        };
        var amount = new Amount()
        {
            currency = "USD",
            total = price, 
            details = details
        };
        obj.Add(amount);
        var transactionList = new List<Transaction>();
        transactionList.Add(new Transaction()
        {
            description = "Transaction description",
            invoice_number = "your invoice number",
            amount = amount,
            item_list = itemList
        });
        obj.Add(transactionList);
        Session["CartDetail"] = obj;
        this.payment = new Payment()
        {
            intent = "sale",
            payer = payer,
            transactions = transactionList,
            redirect_urls = redirUrls
        };

        return this.payment.Create(apiContext);
    }
    void InsertPayments(int paymentMethod, decimal PaidAmount, int ProjectID, int TypeOfPayment)
    {
        DataSet ds = new DataSet();
        int paymentID = 0;
        string err = "";
        try
        {
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "PaymentInsertion @PaymentMethod,@PaidAmount,@ProjectID,@TypeOfPayment";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PaymentMethod", paymentMethod));
                SqlParameters.Add(new SqlParameter("PaidAmount", PaidAmount));
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SqlParameters.Add(new SqlParameter("TypeOfPayment", TypeOfPayment));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                paymentID = Convert.ToInt32(ds.Tables[0].Rows[0][0].ToString().Trim());
                Session["paymentID"] = paymentID.ToString();
            }

        }
        catch { }
    }

    protected void lnkWHRemoveItem_Click(object sender, EventArgs e)
    {
        try
        {
            string ScopesInWApartmentID = ((LinkButton)sender).CommandArgument;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UPDATE Scopes_In_Project_WApartment SET IsActive = 0 WHERE Scopes_In_Project_WApartmentID = @ScopesInWApartmentID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopesInWApartmentID", ScopesInWApartmentID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                GetRooms(ProjectID);
                GetTotalRoomCost(ProjectID);
                GetProjectCostDetails(ProjectID);
                GetRoomDetails(ProjectID);
            }
        }
        catch (Exception ex) { }
    }
}