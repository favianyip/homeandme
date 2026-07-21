using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class SocialRegisterAccount : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {

    }

    protected string GenerateOTP()
    {
        string ReferenceKey = String.Empty;
        try
        {
            string otp = string.Empty;
            int num = new Random().Next(1000, 9999);
            otp = Convert.ToString(num);
            Session["Time"] = DateTime.Now.ToString();
            Session["OTP"] = otp.ToString();
            Session["OtpPrefix"] = otp.ToString();
            ReferenceKey = Session["OtpPrefix"].ToString();
        }
        catch (Exception eX)
        {
            string ErrorIfAny = eX.Message;
        }
        return ReferenceKey;
    }

    protected bool IsRegisterFailedEmail(string Email)
    {
        bool IsFailed = false;
        try
        {
            string ErrorIfAny = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "[IsCheckRegisterFailedEmail]  @Email";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("Email", Email));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
            if (!Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
            }
            if (ds.Tables[0].Rows.Count > 0)
            {
                IsFailed = true;
            }
        }
        catch (Exception eX) { }
        return IsFailed;
    }

    protected void lnkRegister_Click(object sender, EventArgs e)
    {
        try
        {
            string ReferenceKey = string.Empty;
            try
            {
                string errorIfAny = "";
                string Email = txtEmailAddress.Text.Trim();
                string cmd = "SELECT UserID FROM Users WHERE Email='" + Tools.CompileSQL(txtEmailAddress .Text.Trim()) + "'";
                DataSet ds = new DataSet("ds");
                int stat = Tools.GetData(cmd, out ds, out errorIfAny);
                if (ds.Tables[0].Rows.Count > 0)
                {        //A previous failed registration attempt is found
                    if (IsRegisterFailedEmail(Email))
                    {
                        Session["Password"] = txtPassword.Text.Trim();
                        ASPxPopupControlConfirm.ShowOnPageLoad = true;
                    }
                    else
                    {
                        ErrorDisplay.ShowAlertMessage("Email address is already registered with us. Try a different one.");
                        return;
                    }
                }
                else
                {
                    Session["ReferenceKey"] = GenerateOTP();
                    string ErrorIfAny = string.Empty;
                    string Name = txtName.Text.Trim();
                    string Telephone = txtContact.Text.Trim();
                    string Password = txtPassword.Text.Trim();
                    DataSet dataSet = new DataSet("DS");
                    List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "[NewTempUserRegistration] @Name, @Email, @Telephone, @Password, @ReferenceKey";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("Name", Name));
                    SqlParameters.Add(new SqlParameter("Email", Email));
                    SqlParameters.Add(new SqlParameter("Telephone", Telephone));
                    SqlParameters.Add(new SqlParameter("Password", Password));
                    SqlParameters.Add(new SqlParameter("ReferenceKey", Session["ReferenceKey"]));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                    if (!Tools.GetData(SQLCommands, out dataSet, out ErrorIfAny))
                    {
                        ErrorDisplay.ShowAlertMessage("Error found, please try again.");
                    }
                    else
                    {
                        if (dataSet.Tables.Count > 0)
                        {
                            if (dataSet.Tables[0].Rows.Count > 0)
                            {
                                string UserID = string.Empty;
                                UserID = dataSet.Tables[0].Rows[0][0].ToString();
                                Session["TempUserID"] = UserID;
                                string body = "";
                                string sub = "";
                                string email = "";
                                bool val = false;
                                email = txtEmailAddress.Text.Trim();
                                body = Tools.GetEmailBody("Registration-Client", out sub);
                                if (body.Trim() != "" && email != "")
                                {
                                    string content = Session["ReferenceKey"].ToString();
                                    body = body.Replace("[FIRSTNAME]", txtName.Text.Trim());
                                    body = body.Replace("[OTP]", content);
                                    List<string> Attachments = new List<string>();
                                    val = Tools.Pushmail(email, sub, body, Attachments);
                                    if (val == true)
                                    {
                                        Tools.EmailLogTrail(email, sub, body, "", "");
                                    }
                                    Response.Redirect("UserRegisterOtp.aspx");
                                }
                            }
                        }
                    }
                }
            }
            catch (Exception eX) { }
        }
        catch(Exception eX) { }
    }

    protected void UpdateTheFailedAttempt()
    {
        try
        {
            string ErrorIfAny = "";
            string ReferenceKey = string.Empty;
            Session["ReferenceKey"] = GenerateOTP();
            string Email = txtEmailAddress.Text.Trim();
            string Name = txtName.Text.Trim();
            string Telephone = txtContact.Text.Trim();
            string Password = Session["Password"].ToString();
            DataSet dataSet = new DataSet("DS");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "[UpdateTheFailedAttempt] @Name, @Email, @Telephone, @Password, @ReferenceKey";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("Name", Name));
            SqlParameters.Add(new SqlParameter("Email", Email));
            SqlParameters.Add(new SqlParameter("Telephone", Telephone));
            SqlParameters.Add(new SqlParameter("Password", Password));
            SqlParameters.Add(new SqlParameter("ReferenceKey", Session["ReferenceKey"]));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
            if (!Tools.GetData(SQLCommands, out dataSet, out ErrorIfAny))
            {
                ErrorDisplay.ShowAlertMessage("Error found, please try again.");
            }
            else
            {
                if (dataSet.Tables.Count > 0)
                {
                    if (dataSet.Tables[0].Rows.Count > 0)
                    {
                        string UserID = string.Empty;
                        UserID = dataSet.Tables[0].Rows[0][0].ToString();
                        Session["TempUserID"] = UserID;
                        string body = "";
                        string sub = "";
                        bool val = false;
                        body = Tools.GetEmailBody("Registration-Client", out sub);
                        if (body.Trim() != "" && Email != "")
                        {
                            string content = Session["ReferenceKey"].ToString();
                            body = body.Replace("[FIRSTNAME]", txtName.Text.Trim());
                            body = body.Replace("[OTP]", content);
                            List<string> Attachments = new List<string>();
                            val = Tools.Pushmail(Email, sub, body, Attachments);
                            if (val == true)
                            {
                                Tools.EmailLogTrail(Email, sub, body, "", "");
                            }
                            ASPxPopupControlConfirm.ShowOnPageLoad = false;
                            Response.Redirect("UserRegisterOtp.aspx");
                        }
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void lnkProceed_Click(object sender, EventArgs e)
    {
        UpdateTheFailedAttempt();
    }
}