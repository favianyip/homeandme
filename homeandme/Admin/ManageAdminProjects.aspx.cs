using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_ManageAdminProjects : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        btnProjectSearch_Click(sender, e);
        if (hdnScopeID.Value != "" && hdnScopeID.Value != null)
        {
            if (cmbPartners.SelectedItem.Value != "" && cmbPartners.SelectedItem.Value != null)
            {
                GetAssignedPartner(Convert.ToInt32(cmbPartners.SelectedItem.Value));
            }
        }
        if (!IsPostBack)
        {
            GridProjects.DataBind();
            string err = "";
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetAllProjects";
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                }
            }
        }
    }

    protected void btnProjectSearch_Click(object sender, EventArgs e)
    {
        try
        {
            string SearchString = String.Empty;
            if (DateFrom.Value != null && DateTo.Value == null)
            {
                DateTime DateFromDate = Convert.ToDateTime(DateFrom.Value.ToString());
                SearchString = "[GetAllProjects]  " + "'" + txtProjectSearch.Text + "'" + "," + "'" + DateFromDate.ToString("yyyy/MM/dd") + "'" + "," + "'" + "'";
            }
            else if (DateTo.Value != null && DateFrom.Value == null)
            {
                DateTime DateToDate = Convert.ToDateTime(DateTo.Value);
                SearchString = "[GetAllProjects]  " + "'" + txtProjectSearch.Text + "'" + "," + "'" + "'" + "," + "'" + DateToDate.AddDays(1).ToString("yyyy/MM/dd") + "'";
            }
            else if (DateFrom.Value != null && DateTo.Value != null)
            {
                DateTime DateFromDate = Convert.ToDateTime(DateFrom.Value.ToString());
                DateTime DateToDate = Convert.ToDateTime(DateTo.Value);
                SearchString = "[GetAllProjects]  " + "'" + txtProjectSearch.Text + "'" + "," + "'" + DateFromDate.ToString("yyyy/MM/dd") + "'" + "," + "'" + DateToDate.AddDays(1).ToString("yyyy/MM/dd") + "'";
            }
            else
            {
                SearchString = "[GetAllProjects]  " + "'" + txtProjectSearch.Text + "'" + "," + "''" + "," + "''";
            }
            ProjectsSource.SelectCommand = SearchString;
            GridProjects.DataBind();
        }
        catch (Exception eX) { }
    }

    protected void lnkPaymentStatus_Click(object sender, EventArgs e)
    {
        try
        {
            string id = Convert.ToString(((LinkButton)sender).CommandArgument);
            hiddenProjectId.Value = id.ToString();
            divProjects.Visible = false;
            divAssignPartners.Visible = false;
            divPayments.Visible = true;
            divPaymentForm.Visible = false;
            getPaymentData(Convert.ToInt32(hiddenProjectId.Value));
            GridPayment.DataBind();
        }
        catch (Exception eX) { }
    }

    protected void getPaymentData(int ProjectId)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetPaymentDetails @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectId));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                lblStatus.Text = Convert.ToString(ds.Tables[0].Rows[0]["PaymentStatus"]);
                lblPendingAmount.Text = Convert.ToString(ds.Tables[0].Rows[0]["PendingAmount"]);
                lblTotalAmount.Text = Convert.ToString(ds.Tables[0].Rows[0]["TotalAmount"]);

                lblPendingAmountAltration.Text = Convert.ToString(ds.Tables[0].Rows[0]["PendingAmount"]);
                lblTotalAmountAltration.Text = Convert.ToString(ds.Tables[0].Rows[0]["TotalAmount"]);

                if (Convert.ToString(ds.Tables[0].Rows[0]["PendingAmount"]) == "0")
                {
                    btnPaymentNew.Visible = false;
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void lnkAssignPartners_Click(object sender, EventArgs e)
    {
        try
        {
            string id = Convert.ToString(((LinkButton)sender).CommandArgument);
            hiddenProjectId.Value = id.ToString();
            divProjects.Visible = false;
            divAssignPartners.Visible = true;
            divPayments.Visible = false;
            divRoomwithScope.Visible = true;
            divAssginingPartner.Visible = false;
            GridPartner.DataBind();
        }
        catch (Exception eX) { }
    }

    private void getPartnerByScope(int ScopeId)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetPartnerByScope @ScopeId";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeId", ScopeId));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                cmbPartners.DataSource = ds.Tables[0];
                cmbPartners.DataBind();
                cmbPartners.SelectedIndex = cmbPartners.Items.IndexOf(cmbPartners.Items.FindByValue(Convert.ToString("-1")));
                txtScope.Text = Convert.ToString(ds.Tables[0].Rows[1]["Scope"]);
            }
        }
        catch (Exception eX) { }
    }

    private void GetAssignedPartner(int PartnerId)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "AssignedDataByPartner @PartnerID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PartnerID", PartnerId));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                GridAssignedDataPartner.DataSource = ds.Tables[0];
                GridAssignedDataPartner.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void btnAssignPartner_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "AssignPartnerByAdmin @AppointmentDate, @PartnerID, @ScopeID, @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("AppointmentDate", DtDate.Value));
                SqlParameters.Add(new SqlParameter("PartnerID", cmbPartners.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("ScopeID", hdnScopeID.Value));
                SqlParameters.Add(new SqlParameter("ProjectID", hiddenProjectId.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                GridPartner.DataBind();
                ErrorDisplay.ShowAlertMessage("Successfully Done");
                SendPartnerAssignMailToUser();
                GetAssignedPartner(Convert.ToInt32(cmbPartners.SelectedItem.Value));
            }
            else
            {
                ErrorDisplay.ShowAlertMessage("Error found");
            }

        }
        catch (Exception eX) { }
    }

    protected void SendPartnerAssignMailToUser()
    {
        try
        {
            string ErrorIfAny = "";
            string roomDetails = string.Empty;
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetUserDataForMailByProjectID @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", hiddenProjectId.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetRoomDetailsForPartnerAssign @ProjectID,@PartnerID,@ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", hiddenProjectId.Value));
                SqlParameters.Add(new SqlParameter("PartnerID", cmbPartners.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("ScopeID", hdnScopeID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetPartnerByID @PartnerID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PartnerID", cmbPartners.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                StringBuilder sbRoomDetails = new StringBuilder();
                foreach (DataRow dr in ds.Tables[1].Rows)
                {
                    sbRoomDetails.Append("<p>" + dr["RoomDetails"].ToString() + "</p>");
                }
                roomDetails = sbRoomDetails.ToString();
            }
            string EmailSubject = "";
            string userMail = Convert.ToString(ds.Tables[0].Rows[0]["UserEmailAddress"]);
            bool val = false;
            string EmailBody = HttpUtility.UrlDecode(Tools.GetEmailBody("Email Notification Partner Assignment", out EmailSubject));
            EmailBody = EmailBody.Replace("[RoomDetailsHeading]", "Room Details");
            EmailBody = EmailBody.Replace("[RoomDetails]", roomDetails.ToString());
            EmailBody = EmailBody.Replace("[OrderNumber]", hiddenProjectId.Value);
            EmailBody = EmailBody.Replace("[ScheduledDate]", Convert.ToString(ds.Tables[1].Rows[0]["ScheduledDate"]));
            EmailBody = EmailBody.Replace("[Time]", Convert.ToString(ds.Tables[1].Rows[0]["ScheduledTime"]));
            EmailBody = EmailBody.Replace("[CompanyName]", Convert.ToString(ds.Tables[2].Rows[0]["CompanyName"]));
            EmailBody = EmailBody.Replace("[Reg.No]", Convert.ToString(ds.Tables[2].Rows[0]["CompanyRegisterNumber"]));
            EmailBody = EmailBody.Replace("[Address1]", Convert.ToString(ds.Tables[2].Rows[0]["CompanyAddress1"]));
            EmailBody = EmailBody.Replace("[Address2]", Convert.ToString(ds.Tables[2].Rows[0]["CompanyAddress2"]));
            EmailBody = EmailBody.Replace("[ContactNumber]", Convert.ToString(ds.Tables[2].Rows[0]["Contact"]));
            EmailBody = EmailBody.Replace("[Name]", Convert.ToString(ds.Tables[0].Rows[0]["Name"]));
            List<string> Attachments = new List<string>();
            val = Tools.Pushmail(userMail, EmailSubject, EmailBody, Attachments);
            if (val == true)
            {
                Tools.EmailLogTrail(userMail, EmailSubject, EmailBody, "", "");
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCancelPartner_Click(object sender, EventArgs e)
    {
        try
        {
            divProjects.Visible = true;
            divAssginingPartner.Visible = false;
            divRoomwithScope.Visible = false;
        }
        catch (Exception eX) { }
    }

    protected void lnkAssign_Click(object sender, EventArgs e)
    {
        try
        {
            hdnPartnerAssigned.Value = "-1";
            divRoomwithScope.Visible = false;
            divAssginingPartner.Visible = true;
            string ScopeID = ((Button)sender).CommandArgument;
            hdnScopeID.Value = ScopeID;
            getPartnerByScope(Convert.ToInt32(ScopeID));
        }
        catch (Exception eX) { }
    }

    protected void btnBackToPartner_Click(object sender, EventArgs e)
    {
        try
        {
            divAssginingPartner.Visible = false;
            divRoomwithScope.Visible = true;
        }
        catch (Exception eX) { }
    }

    protected void btnBackToProjectlist_Click(object sender, EventArgs e)
    {
        try
        {
            divAssignPartners.Visible = false;
            divPayments.Visible = false;
            divProjects.Visible = true;
        }
        catch (Exception eX) { }
    }

    protected void btnPaymentSubmit_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "AddPayment @PaymentMethod, @PaidOn, @PaidAmount, @TransactionID , @IPN_Parameters, @ProjectID, @Remarks, @TypeOfPayment, @Status";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PaymentMethod", cmbPaymentMethod.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("PaidOn", DateTime.Now));
                SqlParameters.Add(new SqlParameter("PaidAmount", txtPaymentAmount.Text.Trim()));
                SqlParameters.Add(new SqlParameter("TransactionID", txtTransactionID.Text.Trim()));
                SqlParameters.Add(new SqlParameter("IPN_Parameters", " "));
                SqlParameters.Add(new SqlParameter("ProjectID", hiddenProjectId.Value));
                SqlParameters.Add(new SqlParameter("Remarks", txtPaymentRemarks.Text.Trim()));
                SqlParameters.Add(new SqlParameter("TypeOfPayment", "1"));
                SqlParameters.Add(new SqlParameter("Status", "2"));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (Convert.ToString(ds.Tables[0].Rows[0]["IsAmountPending"]) == "1")
                {
                    string TAmount = Convert.ToString(ds.Tables[0].Rows[0]["TotalAmount"]);
                    string PAmount = Convert.ToString(ds.Tables[0].Rows[0]["PendingAmount"]);
                    string TotalPaid = Convert.ToString(ds.Tables[0].Rows[0]["PaidAmount"]);
                    string paid = txtPaymentAmount.Text.Trim();
                }
                else
                {
                    string Error = "";
                    DataSet DS = new DataSet();
                    List<Tools.SqlContainer> SSQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SSQLContainer = new Tools.SqlContainer();
                        SSQLContainer.Query = "UPDATE Payments SET Status = @Status WHERE ProjectID = @ProjectID AND Status = 2";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("ProjectID", hiddenProjectId.Value));
                        SqlParameters.Add(new SqlParameter("Status", "3"));
                        SSQLContainer.SqlParameters = SqlParameters;
                        SSQLCommands.Add(SSQLContainer);
                    }
                    if (Tools.GetData(SSQLCommands, out DS, out Error))
                    {
                    }
                    string TAmount = Convert.ToString(ds.Tables[0].Rows[0]["TotalAmount"]);
                    string PAmount = Convert.ToString(ds.Tables[0].Rows[0]["PendingAmount"]);
                    string TotalPaid = Convert.ToString(ds.Tables[0].Rows[0]["PaidAmount"]);
                    string paid = txtPaymentAmount.Text.Trim();
                }
            }
            divPaymentForm.Visible = false;
            txtPaymentAmount.Text = String.Empty;
            txtPaymentRemarks.Text = String.Empty;
            txtTransactionID.Text = String.Empty;
            cmbPaymentMethod.SelectedIndex = cmbPaymentMethod.Items.IndexOf(cmbPaymentMethod.Items.FindByValue("-1"));
            GridPayment.DataBind();
            btnPaymentNew.Visible = true;
            getPaymentData(Convert.ToInt32(hiddenProjectId.Value));
        }
        catch (Exception eX) { }
    }

    protected void btnPaymentCancel_Click(object sender, EventArgs e)
    {
        try
        {
            divPaymentForm.Visible = false;
            txtPaymentAmount.Text = String.Empty;
            txtPaymentRemarks.Text = String.Empty;
            txtTransactionID.Text = String.Empty;
            cmbPaymentMethod.SelectedIndex = cmbPaymentMethod.Items.IndexOf(cmbPaymentMethod.Items.FindByValue("-1"));
            btnPaymentNew.Visible = true;
        }
        catch (Exception eX) { }
    }

    protected void btnPaymentNew_Click(object sender, EventArgs e)
    {
        try
        {
            divPaymentForm.Visible = true;
            btnPaymentNew.Visible = false;
            txtPaymentAmount.Text = String.Empty;
            txtPaymentRemarks.Text = String.Empty;
            txtTransactionID.Text = String.Empty;
            cmbPaymentMethod.SelectedIndex = cmbPaymentMethod.Items.IndexOf(cmbPaymentMethod.Items.FindByValue("-1"));
            GridPayment.DataBind();
            btnPaymentSubmit.Text = "Create";
        }
        catch (Exception eX) { }
    }

    protected void btnBack_Click(object sender, EventArgs e)
    {
        try
        {
            divPayments.Visible = false;
            divAssignPartners.Visible = false;
            divProjects.Visible = true;
        }
        catch (Exception eX) { }
    }

    protected void btnPartnerSearch_Click(object sender, EventArgs e)
    {
        try
        {
            string SearchString = String.Empty;
            if (DatePartFrom.Value != null && DatePartTo.Value == null)
            {
                DateTime DateFromDate = Convert.ToDateTime(DatePartFrom.Value.ToString());
                SearchString = "[GetProjectPartnerDetails]  " + "'" + txtPartnerSearch.Text + "'" + "," + "'" + DateFromDate.ToString("yyyy/MM/dd") + "'" + "," + "'" + "'";
            }
            else if (DatePartTo.Value != null && DatePartFrom.Value == null)
            {
                DateTime DateToDate = Convert.ToDateTime(DatePartTo.Value);
                SearchString = "[GetProjectPartnerDetails]  " + "'" + txtPartnerSearch.Text + "'" + "," + "'" + "'" + "," + "'" + DateToDate.AddDays(1).ToString("yyyy/MM/dd") + "'";
            }
            else if (DatePartFrom.Value != null && DatePartTo.Value != null)
            {
                DateTime DateFromDate = Convert.ToDateTime(DatePartFrom.Value.ToString());
                DateTime DateToDate = Convert.ToDateTime(DatePartTo.Value);
                SearchString = "[GetProjectPartnerDetails]  " + "'" + txtPartnerSearch.Text + "'" + "," + "'" + DateFromDate.ToString("yyyy/MM/dd") + "'" + "," + "'" + DateToDate.AddDays(1).ToString("yyyy/MM/dd") + "'";
            }
            else
            {
                SearchString = "[GetProjectPartnerDetails]  " + "'" + txtPartnerSearch.Text + "'" + "," + "''" + "," + "''";
            }
            PartnerSource.SelectCommand = SearchString;
            GridPartners.DataBind();
        }
        catch (Exception eX) { }
    }

    protected void btnPartnerDateSearch_Click(object sender, EventArgs e)
    {
        try
        {
            string SearchString = String.Empty;
            if (DatePartFrom.Value != null && DatePartTo.Value == null)
            {
                DateTime DateFromDate = Convert.ToDateTime(DatePartFrom.Value.ToString());
                SearchString = "[GetProjectPartnerDetails]  " + "'" + txtPartnerSearch.Text + "'" + "," + "'" + DateFromDate.ToString("yyyy/MM/dd") + "'" + "," + "'" + "'";
            }
            else if (DatePartTo.Value != null && DatePartFrom.Value == null)
            {
                DateTime DateToDate = Convert.ToDateTime(DatePartTo.Value);
                SearchString = "[GetProjectPartnerDetails]  " + "'" + txtPartnerSearch.Text + "'" + "," + "'" + "'" + "," + "'" + DateToDate.AddDays(1).ToString("yyyy/MM/dd") + "'";
            }
            else if (DatePartFrom.Value != null && DatePartTo.Value != null)
            {
                DateTime DateFromDate = Convert.ToDateTime(DatePartFrom.Value.ToString());
                DateTime DateToDate = Convert.ToDateTime(DatePartTo.Value);
                SearchString = "[GetProjectPartnerDetails]  " + "'" + txtPartnerSearch.Text + "'" + "," + "'" + DateFromDate.ToString("yyyy/MM/dd") + "'" + "," + "'" + DateToDate.AddDays(1).ToString("yyyy/MM/dd") + "'";
            }
            else
            {
                SearchString = "[GetProjectPartnerDetails]  " + "'" + txtPartnerSearch.Text + "'" + "," + "''" + "," + "''";
            }
            PartnerSource.SelectCommand = SearchString;
            GridPartners.DataBind();
        }
        catch (Exception eX) { }
    }

    protected void btnFilter_Click(object sender, EventArgs e)
    {
        try
        {
            string SearchString = String.Empty;
            if (DateFrom.Value != null && DateTo.Value == null)
            {
                DateTime DateFromDate = Convert.ToDateTime(DateFrom.Value.ToString());
                SearchString = "[GetAllProjects]  " + "'" + txtProjectSearch.Text + "'" + "," + "'" + DateFromDate.ToString("yyyy/MM/dd") + "'" + "," + "'" + "'";
            }
            else if (DateTo.Value != null && DateFrom.Value == null)
            {
                DateTime DateToDate = Convert.ToDateTime(DateTo.Value);
                SearchString = "[GetAllProjects]  " + "'" + txtProjectSearch.Text + "'" + "," + "'" + "'" + "," + "'" + DateToDate.AddDays(1).ToString("yyyy/MM/dd") + "'";
            }
            else if (DateFrom.Value != null && DateTo.Value != null)
            {
                DateTime DateFromDate = Convert.ToDateTime(DateFrom.Value.ToString());
                DateTime DateToDate = Convert.ToDateTime(DateTo.Value);
                SearchString = "[GetAllProjects]  " + "'" + txtProjectSearch.Text + "'" + "," + "'" + DateFromDate.ToString("yyyy/MM/dd") + "'" + "," + "'" + DateToDate.AddDays(1).ToString("yyyy/MM/dd") + "'";
            }
            else
            {
                SearchString = "[GetAllProjects]  " + "'" + txtProjectSearch.Text + "'" + "," + "''" + "," + "''";
            }
            ProjectsSource.SelectCommand = SearchString;
            GridProjects.DataBind();
        }
        catch { }
    }

    protected void lnkPaymentApprove_Click(object sender, EventArgs e)
    {
        try
        {
            txtApproveAmount.Text = String.Empty;
            txtApproveRemarks.Text = String.Empty;
            txtApproveTransactionID.Text = String.Empty;
            cmbApprovePaymentMethod.SelectedIndex = cmbApprovePaymentMethod.Items.IndexOf(cmbApprovePaymentMethod.Items.FindByValue("-1"));
            string PaymentID = ((LinkButton)sender).CommandArgument;
            Session["PaymentID"] = PaymentID.ToString();
            string Error = "";
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM Payments WHERE PaymentID = @PaymentID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PaymentID", PaymentID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out DS, out Error))
            {
                txtApproveAmount.Text = Convert.ToString(DS.Tables[0].Rows[0]["PaidAmount"]);
                cmbApprovePaymentMethod.SelectedIndex = cmbApprovePaymentMethod.Items.IndexOf(cmbApprovePaymentMethod.Items.FindByValue(Convert.ToString(DS.Tables[0].Rows[0]["PaymentMethod"])));
                popApprove.ShowOnPageLoad = true;
            }
        }
        catch { }
    }

    protected void lnkPaymentView_Click(object sender, EventArgs e)
    {
        try
        {
            string PaymentID = ((LinkButton)sender).CommandArgument;
            string Error = "";
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM Payments WHERE PaymentID = @PaymentID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PaymentID", PaymentID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out DS, out Error))
            {
                if (Convert.ToString(DS.Tables[0].Rows[0]["PaymentImageURL"]) == "" || Convert.ToString(DS.Tables[0].Rows[0]["PaymentImageURL"]) == null) { }
                else
                {
                    pcIamge.ShowOnPageLoad = true;
                    PaymentImage.ImageUrl = Convert.ToString(DS.Tables[0].Rows[0]["PaymentImageURL"]);
                }
            }
        }
        catch { }
    }

    protected void btnApprove_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UpdatePaymentApproves @PaymentMethod, @PaidAmount, @TransactionID , @IPN_Parameters, @Remarks, @TypeOfPayment, @Status, @PaymentID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PaymentMethod", cmbApprovePaymentMethod.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("PaidAmount", txtApproveAmount.Text.Trim()));
                SqlParameters.Add(new SqlParameter("TransactionID", txtApproveTransactionID.Text.Trim()));
                SqlParameters.Add(new SqlParameter("IPN_Parameters", " "));
                SqlParameters.Add(new SqlParameter("Remarks", txtApproveRemarks.Text.Trim()));
                SqlParameters.Add(new SqlParameter("TypeOfPayment", "1"));
                SqlParameters.Add(new SqlParameter("Status", "2"));
                SqlParameters.Add(new SqlParameter("PaymentID", Session["PaymentID"]));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                GridPayment.DataBind();
                getPaymentData(Convert.ToInt32(hiddenProjectId.Value));
                popApprove.ShowOnPageLoad = false;
            }
        }
        catch { }
    }

    protected void btnClose_Click(object sender, EventArgs e)
    {
        popApprove.ShowOnPageLoad = false;
    }

    protected void btnPaymentAltration_Click(object sender, EventArgs e)
    {
        try
        {
            divPaymentAltration.Visible = true;
            divPaymentForm.Visible = false;
            divTop.Visible = false;
            divGrid.Visible = false;
            getPaymentData(Convert.ToInt32(hiddenProjectId.Value));
            string err = "";
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT FinalAdjustmentCost, CostDifference FROM Projects WHERE ProjectID = @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", hiddenProjectId.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    txtFinalAdjustmentCost.Text = Convert.ToString(ds.Tables[0].Rows[0]["FinalAdjustmentCost"]);
                    txtCostDifference.Text = Convert.ToString(ds.Tables[0].Rows[0]["CostDifference"]);
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCostSave_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UpdateFinalCostForProjects @FinalAdjustmentCost, @CostDifference, @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("FinalAdjustmentCost", txtFinalAdjustmentCost.Text));
                SqlParameters.Add(new SqlParameter("CostDifference", txtCostDifference.Text));
                SqlParameters.Add(new SqlParameter("ProjectID", hiddenProjectId.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                divPaymentAltration.Visible = false;
                divPaymentForm.Visible = false;
                divTop.Visible = true;
                divGrid.Visible = true;
                txtCostDifference.Text = String.Empty;
                txtFinalAdjustmentCost.Text = String.Empty;
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCostCancel_Click(object sender, EventArgs e)
    {
        divPaymentAltration.Visible = false;
        divPaymentForm.Visible = false;
        divTop.Visible = true;
        divGrid.Visible = true;
        txtCostDifference.Text = String.Empty;
        txtFinalAdjustmentCost.Text = String.Empty;
    }

    protected void txtFinalAdjustmentCost_TextChanged(object sender, EventArgs e)
    {
        try
        {
            int costDifference = 0;
            int TotalAmount = Convert.ToInt32(lblTotalAmountAltration.Text);
            costDifference = Convert.ToInt32(txtFinalAdjustmentCost.Text) - TotalAmount;
            txtCostDifference.Text = Convert.ToString(costDifference);
        }
        catch (Exception eX) { }
    }

    protected void CostAdjustmentsMail()
    {
        try
        {
            string ErrorIfAny = String.Empty;
            bool val = false;
            string EmailSubject = String.Empty;
            string UserMail = String.Empty;
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetUserBasicDataByProject @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", hiddenProjectId.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    UserMail = Convert.ToString(ds.Tables[0].Rows[0]["Email"]);
                    if (UserMail.ToString() == "" || UserMail.ToString() == null)
                    {
                        val = false;
                    }
                    else
                    {
                        string EmailBody = HttpUtility.UrlDecode(Tools.GetEmailBody("Project Offer Confirmation Mail - To User", out EmailSubject));
                        EmailBody = EmailBody.Replace("[UserName]", Convert.ToString(ds.Tables[0].Rows[0]["UserName"]));
                        EmailBody = EmailBody.Replace("[FinalAdjustmentCost]", Convert.ToString(txtFinalAdjustmentCost.Text));
                        List<string> Attachments = new List<string>();
                        val = Tools.Pushmail(UserMail, EmailSubject, EmailBody, Attachments);
                        if (val == true)
                        {
                            Tools.EmailLogTrail(UserMail, EmailSubject, EmailBody, "", "");
                        }
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void lnkInitialPaymentInvoice_Click(object sender, EventArgs e)
    {
        try
        {
            string id = Convert.ToString(((LinkButton)sender).CommandArgument);
            ProjectInvoice Xr_Invoice = new ProjectInvoice();
            Xr_Invoice.ProjectID = id.ToString();
            Xr_Invoice.UpdateReport();
            Xr_Invoice.CreateDocument();
            String FileName = "ProjectInvoice" + id.ToString().Trim() + "_" + DateTime.Now.ToString("ddMMyyyyhhmmss") + ".pdf";
            var InvoiceFilePath = Path.Combine(Server.MapPath("~/") + @"\ExtractedFiles\ProjectInvoice\", FileName);
            DevExpress.XtraPrinting.PdfExportOptions Sopt = new DevExpress.XtraPrinting.PdfExportOptions();
            Sopt.ShowPrintDialogOnOpen = false;
            System.Threading.Thread.Sleep(10);
            Xr_Invoice.ExportToPdf(InvoiceFilePath, Sopt);
            Response.ContentType = "application/pdf";
            Response.AppendHeader("Content-Disposition", "attachment; filename=" + FileName + "");
            Response.TransmitFile(InvoiceFilePath);
            Response.End();
        }
        catch (Exception eX) { }
    }

    protected void cmbPartners_SelectedIndexChanged(object sender, EventArgs e)
    {
        int PartnerID = Convert.ToInt32(cmbPartners.SelectedItem.Value);
        GetAssignedPartner(PartnerID);
    }

    protected void GridAssignedDataPartner_PageIndexChanged(object sender, EventArgs e)
    {
        try
        {
            GetAssignedPartner(Convert.ToInt32(cmbPartners.SelectedItem.Value));
        }
        catch (Exception eX) { }
    }

    protected void lnkUpdateStatus_Click(object sender, EventArgs e)
    {
        try
        {
            string ProjectID = Convert.ToString(((LinkButton)sender).CommandArgument);
            hiddenProjectId.Value = ProjectID.ToString();
            string ErrorIfAny = String.Empty;
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectStatusDetails @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                pcStatus.ShowOnPageLoad = true;
                lblRequestID.Text = "Request ID : " + Convert.ToString(ProjectID);
                lblStatusText.Text = "Current status : " + Convert.ToString(ds.Tables[0].Rows[0]["ProjectStatusText"]);
                int Status = Convert.ToInt32(ds.Tables[0].Rows[0]["ProjectStatus"]);
                if (Status != 2 && Status != 7 && Status != 3 && Status != 8 && Status != 9)
                {
                    cmbStatus.SelectedIndex = cmbStatus.Items.IndexOf(cmbStatus.Items.FindByValue(Convert.ToString("-1")));
                }
                else
                {
                    cmbStatus.SelectedIndex = cmbStatus.Items.IndexOf(cmbStatus.Items.FindByValue(Convert.ToString(ds.Tables[0].Rows[0]["ProjectStatus"])));
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void btnStatusUpdate_Click(object sender, EventArgs e)
    {
        try
        {
            string ErrorIfAny = String.Empty;
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UPDATE Projects SET ProjectStatus = @ProjectStatus WHERE ProjectID = @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectStatus", cmbStatus.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("ProjectID", hiddenProjectId.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                pcStatus.ShowOnPageLoad = false;
                GridProjects.DataBind();
            }
        }
        catch (Exception ex) { }
    }

    protected void btnStatusUpdateCancel_Click(object sender, EventArgs e)
    {
        try
        {
            lblStatusText.Text = string.Empty;
            cmbStatus.SelectedIndex = cmbStatus.Items.IndexOf(cmbStatus.Items.FindByValue(Convert.ToString("-1")));
            GridProjects.DataBind();
            pcStatus.ShowOnPageLoad = false;
        }
        catch (Exception eX) { }
    }


    protected void lnkReschedule_Click(object sender, EventArgs e)
    {
        try
        {
            string projectID = Convert.ToString(((LinkButton)sender).CommandArgument);
            string CommandNameValue = Convert.ToString(((LinkButton)sender).CommandName);
            string[] data1 = CommandNameValue.Split(' ');
            string scopeID = data1[0].Trim();
            string partnerID = data1[1];
            hdnProjectID.Value = Convert.ToString(projectID);
            hdnRescheduleScopeID.Value = Convert.ToString(scopeID);
            hdnPartnerID.Value = Convert.ToString(partnerID);
            popUpReschedule.ShowOnPageLoad = true;
            dtReschedule.Value = DBNull.Value;
        }
        catch (Exception eX) { }
    }

    protected void btnCanelPopUpReschedule_Click(object sender, EventArgs e)
    {
        try
        {
            popUpReschedule.ShowOnPageLoad = false;
        }
        catch (Exception eX) { }
    }

    protected void btnUpdateAppointmentDate_Click(object sender, EventArgs e)
    {
        try
        {
            string ErrorIfAny = String.Empty;
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "ReshedulePartnerAppointmentDate @AppointmentDate, @PartnerID, @ScopeID, @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("AppointmentDate", dtReschedule.Value));
                SqlParameters.Add(new SqlParameter("PartnerID", hdnPartnerID.Value));
                SqlParameters.Add(new SqlParameter("ScopeID", hdnRescheduleScopeID.Value));
                SqlParameters.Add(new SqlParameter("ProjectID", hdnProjectID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                popUpReschedule.ShowOnPageLoad = false;
                ErrorDisplay.ShowAlertMessage("Successfully Done");
                GridPartners.DataBind();
            }
            else
            {
                popUpReschedule.ShowOnPageLoad = false;
                ErrorDisplay.ShowAlertMessage("Something went wrong. Please try again.");
            }
        }
        catch (Exception eX) { }
    }

    protected void lnkDownloadDocuments_Click(object sender, EventArgs e)
    {
        try
        {
            btnFloorPlanDownload.Visible = true;
            btnPermitFormDownload.Visible = true;
            btnIndemnityFormDownload.Visible = true;
            lblFloorPlan.Visible = false;
            lblPermitForm.Visible = false;
            lblIndemnityForm.Visible = false;
            string projectID = Convert.ToString(((LinkButton)sender).CommandArgument);
            hdnProjectID.Value = Convert.ToString(projectID);
            string ErrorIfAny = String.Empty;
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectDocuments @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", hdnProjectID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                popUpDocuments.ShowOnPageLoad = true;
                string IsFloorPlanUploaded = Convert.ToString(ds.Tables[0].Rows[0]["IsFloorPlanUploaded"]);
                string IsPermitUploaded = Convert.ToString(ds.Tables[0].Rows[0]["IsPermitUploaded"]);
                string IsIndemnityFormUploaded = Convert.ToString(ds.Tables[0].Rows[0]["IsIndemnityFormUploaded"]);
                if (IsFloorPlanUploaded == "0")
                {
                    btnFloorPlanDownload.Visible = false;
                    lblFloorPlan.Visible = true;
                }
                if (IsPermitUploaded == "0")
                {
                    btnPermitFormDownload.Visible = false;
                    lblPermitForm.Visible = true;
                }
                if (IsIndemnityFormUploaded == "0")
                {
                    btnIndemnityFormDownload.Visible = false;
                    lblIndemnityForm.Visible = true;
                }
            }
        }
        catch (Exception eX) { }

    }

    protected void btnFloorPlanDownload_Click(object sender, EventArgs e)
    {
        try
        {
            string ErrorIfAny = String.Empty;
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectDocuments @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", hdnProjectID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                string IsFloorPlanUploaded = Convert.ToString(ds.Tables[0].Rows[0]["IsFloorPlanUploaded"]);
                string FloorPlanPath = Convert.ToString(ds.Tables[0].Rows[0]["FloorPlanPath"]);
                if (IsFloorPlanUploaded == "1")
                {
                    if (FloorPlanPath != "" && FloorPlanPath != null)
                    {
                        string extension = Path.GetExtension(FloorPlanPath);
                        if (extension == ".png")
                        {
                            Response.ContentType = "image/png";
                        }
                        else if (extension == ".jpeg")
                        {
                            Response.ContentType = "image/jpeg";
                        }
                        else if (extension == ".jpg")
                        {
                            Response.ContentType = "image/jpeg";
                        }
                        else if (extension == ".pdf")
                        {
                            Response.ContentType = "application/pdf";
                        }
                        string filename = Path.GetFileName(FloorPlanPath);
                        String Header = "Attachment; Filename=" + filename;
                        Response.AppendHeader("Content-Disposition", Header);
                        string actualFilePath = Server.MapPath("/UploadedFiles/FloorPlan/" + filename);
                        Response.TransmitFile(actualFilePath);
                        Response.End();
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnPermitFormDownload_Click(object sender, EventArgs e)
    {
        try
        {
            string ErrorIfAny = String.Empty;
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectDocuments @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", hdnProjectID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                string IsPermitUploaded = Convert.ToString(ds.Tables[0].Rows[0]["IsPermitUploaded"]);
                string PermitPath = Convert.ToString(ds.Tables[0].Rows[0]["PermitPath"]);
                if (IsPermitUploaded == "1")
                {
                    if (PermitPath != "" && PermitPath != null)
                    {
                        string extension = Path.GetExtension(PermitPath);
                        if (extension == ".png")
                        {
                            Response.ContentType = "image/png";
                        }
                        else if (extension == ".jpeg")
                        {
                            Response.ContentType = "image/jpeg";
                        }
                        else if (extension == ".jpg")
                        {
                            Response.ContentType = "image/jpeg";
                        }
                        else if (extension == ".pdf")
                        {
                            Response.ContentType = "application/pdf";
                        }
                        string filename = Path.GetFileName(PermitPath);
                        String Header = "Attachment; Filename=" + filename;
                        Response.AppendHeader("Content-Disposition", Header);
                        string actualFilePath = Server.MapPath("/UploadedFiles/RenovationPermit/" + filename);
                        Response.TransmitFile(actualFilePath);
                        Response.End();
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnIndemnityFormDownload_Click(object sender, EventArgs e)
    {
        try
        {
            string ErrorIfAny = String.Empty;
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectDocuments @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", hdnProjectID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                string IsIndemnityFormUploaded = Convert.ToString(ds.Tables[0].Rows[0]["IsIndemnityFormUploaded"]);
                string IndemnityFormPath = Convert.ToString(ds.Tables[0].Rows[0]["IndemnityFormPath"]);
                if (IsIndemnityFormUploaded == "1")
                {
                    if (IndemnityFormPath != "" && IndemnityFormPath != null)
                    {
                        string extension = Path.GetExtension(IndemnityFormPath);
                        if (extension == ".png")
                        {
                            Response.ContentType = "image/png";
                        }
                        else if (extension == ".jpeg")
                        {
                            Response.ContentType = "image/jpeg";
                        }
                        else if (extension == ".jpg")
                        {
                            Response.ContentType = "image/jpeg";
                        }
                        else if (extension == ".pdf")
                        {
                            Response.ContentType = "application/pdf";
                        }
                        string filename = Path.GetFileName(IndemnityFormPath);
                        String Header = "Attachment; Filename=" + filename;
                        Response.AppendHeader("Content-Disposition", Header);
                        string actualFilePath = Server.MapPath("/UploadedFiles/Indemnity/" + filename);
                        Response.TransmitFile(actualFilePath);
                        Response.End();
                    }
                }
            }
        }
        catch (Exception eX) { }
    }
}