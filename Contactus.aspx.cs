using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Net;

public partial class Contactus : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {

    }

    void clearControls()
    {
        txtName.Text = String.Empty;
        txtEmail.Text = String.Empty;
        txtPhone.Text = String.Empty;
        txtComment.Text = String.Empty;
        cbAgreePolicy.Checked = false;
    }

    protected void btnSendMessage_Click(object sender, EventArgs e)
    {
        try
        {
            if (cbAgreePolicy.Checked != true)
            {
                ErrorDisplay.ShowAlertMessage("Please agree the policy before you submit.");
            }
            else
            {
                string ErrorIfAny = String.Empty;
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "AddContactUsDetails @Name,@Email,@Phone,@Comment,@IsAgree";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("Name", txtName.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("Email", txtEmail.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("Phone", txtPhone.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("Comment", txtComment.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("IsAgree", "1"));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                {
                    SendMail(txtName.Text, txtEmail.Text, txtComment.Text, txtPhone.Text);
                }
            }
        }
        catch (Exception eX) { }
    }

    void SendMail(string Name, string Email, string Message, string Contact)
    {
        try
        {
            ServicePointManager.Expect100Continue = true;
            System.Net.ServicePointManager.SecurityProtocol = System.Net.SecurityProtocolType.Tls12;
            bool adminVal = false;
            bool UserVal = false;
            bool MailSent = false;
            bool MailSentAdmin = false;
            string AdminEmail = ConfigurationManager.AppSettings["AdminEmail"];
            if (AdminEmail.ToString() == "" || AdminEmail.ToString() == null)
            {
                adminVal = false;
            }
            else
            {
                adminVal = true;
                string AdminEmailSubject = "";
                string AdminEmailBody = Tools.GetEmailBody("Submission of Contact to Admin", out AdminEmailSubject);
                AdminEmailBody = AdminEmailBody.Replace("[NAME]", Name);
                AdminEmailBody = AdminEmailBody.Replace("[EMAIL_ADDRESS]", Email);
                AdminEmailBody = AdminEmailBody.Replace("[COMMENT]", Message);
                AdminEmailBody = AdminEmailBody.Replace("[PHONE]", Contact);
                List<string> Attachments = new List<string>();
                MailSentAdmin = Tools.Pushmail(AdminEmail, AdminEmailSubject, AdminEmailBody, Attachments);
                if (MailSentAdmin == true)
                {
                    Tools.EmailLogTrail(AdminEmail, AdminEmailSubject, AdminEmailBody, "", "");
                }

            }

            //to  user
            if (Email.ToString() == "" || Email.ToString() == null)
            {
                UserVal = false;
            }
            else
            {
                UserVal = true;
                string UserEmailSubject = "Thank you for contacting us";
                string UserEmailBody = Tools.GetEmailBody("Submission of Contact to User", out UserEmailSubject);
                UserEmailBody = UserEmailBody.Replace("[CONTACT_PERSON]", Name);
                UserEmailBody = UserEmailBody.Replace("[EMAIL]", Email);
                List<string> AttachmentsUser = new List<string>();
                MailSent = Tools.Pushmail(Email, UserEmailSubject, UserEmailBody, AttachmentsUser);
                if (MailSent == true)
                {
                    Tools.EmailLogTrail(Email, UserEmailSubject, UserEmailBody, "", "");
                }
            }
            if (MailSent == false)//|| MailSentAdmin == false)/// adminmail not in webconfig
            {
                clearControls();
                ErrorDisplay.ShowAlertMessage("Please give the details.");
                return;
            }
            else
            {
                clearControls();
                ErrorDisplay.ShowAlertMessage("Thank you for reaching out to us. We will come back to you shortly.");
                return;
            }
        }
        catch (Exception eX) { }
    }
}