using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class ForgotPassword : System.Web.UI.Page
{
    string ErrorIfAny = String.Empty;
    protected void Page_Load(object sender, EventArgs e)
    {

    }

    protected void lnkSubmit_Click(object sender, EventArgs e)
    {
        try
        {
            bool val = false;
            string userEmail = Convert.ToString(txtEmailAddress.Text.Trim());
            DataSet dS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "ForgotPasswordTokenUpdate @EmailAddress";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("@EmailAddress", txtEmailAddress.Text.ToString().Trim()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out dS, out ErrorIfAny))
            {
                if (dS.Tables[0].Rows.Count > 0)
                {
                    if(Convert.ToString(dS.Tables[0].Rows[0]["IsUserExist"]) == "0")
                    {
                        lblMessage.Text = "User does not exist with this email.";
                        ScriptManager.RegisterStartupScript(this.Page, this.GetType(), "script", "openMessageModal();", true);
                    }
                    else
                    {
                        if (userEmail.ToString() == "" || userEmail.ToString() == null)
                        {
                            val = false;
                        }
                        else
                        {
                            string EmailSubject = String.Empty;
                            string EmailBody = HttpUtility.UrlDecode(Tools.GetEmailBody("Forgot Password", out EmailSubject));
                            EmailBody = EmailBody.Replace("[UserName]", Convert.ToString(dS.Tables[0].Rows[0]["Name"]));
                            EmailBody = EmailBody.Replace("[URL]", ConfigurationManager.AppSettings["SiteUrl"] +"UpdatePassword.aspx?utoken="+ Convert.ToString(dS.Tables[0].Rows[0]["UserToken"]));
                            List<string> Attachments = new List<string>();
                            val = Tools.Pushmail(userEmail, EmailSubject, EmailBody, Attachments);
                            if (val == true)
                            {
                                Tools.EmailLogTrail(userEmail, EmailSubject, EmailBody, "", "");
                                lblMessage.Text = "Email Verified, Please Check Your Registered Mail to Reset Your Password";
                                ScriptManager.RegisterStartupScript(this.Page, this.GetType(), "script", "openMessageModal();", true);
                            }
                        }
                    }
                }
            }
        }
        catch (Exception eX) { }
    }
}