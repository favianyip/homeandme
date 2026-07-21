using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class SignUp : System.Web.UI.Page
{
    string ErrorIfAny = String.Empty;
    string ProjectID = String.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            if (Session["ProjectID"] != null)
            {
                ProjectID = Session["ProjectID"].ToString();
            }
        }
        catch (Exception ex) { }
    }

    void ClearControls()
    {
        txtName.Text = String.Empty;
        txtContact.Text = String.Empty;
        txtEmailAddress.Text = String.Empty;
        txtPassword.Text = String.Empty;
        txtConfirmPswd.Text = String.Empty;
        lblMsg.Text = String.Empty;
    }

    protected void lnkSignUp_Click(object sender, EventArgs e)
    {
        try
        {
            string UserID = "-1";
            if (ValidateFields() == 0)
            {
                DataSet DS = new DataSet();
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "CreateUsers @Name, @Email, @Password, @Contact";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("Name", txtName.Text.ToString().Trim()));
                    SqlParameters.Add(new SqlParameter("Email", txtEmailAddress.Text.ToString().Trim()));
                    SqlParameters.Add(new SqlParameter("Password", txtConfirmPswd.Text.ToString().Trim()));
                    SqlParameters.Add(new SqlParameter("Contact", txtContact.Text.ToString().Trim()));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                {
                    if (Convert.ToInt32(DS.Tables[0].Rows[0]["IsUserAlreadyExists"]) == 1)
                    {
                        lblMsg.Text = "Already have an account with this email.";
                    }
                    else
                    {
                        ClearControls();
                        UserID = DS.Tables[1].Rows[0]["UserID"].ToString().Trim();
                        string name = Convert.ToString(DS.Tables[1].Rows[0]["Name"]);
                        string email = Convert.ToString(DS.Tables[1].Rows[0]["Email"]);
                        Session["UserID"] = UserID;
                        SendMail(name.ToString(), email.ToString());
                        if (ProjectID != null && ProjectID != "")
                        {
                            SaveUserForProject(UserID);
                            Response.Redirect("/MyProject.aspx");
                        }
                        else
                        {
                            Response.Redirect("/Home.aspx");
                        }
                    }
                }
                else
                {
                    lblMsg.Text = "Error found.Please try again.";
                }
            }
        }
        catch (Exception eX) { }
    }

    int ValidateFields()
    {
        int IsEmpty = 0;
        if (txtName.Text == String.Empty)
        {
            lblMsg.Text = "Please complete all field with (*)";
            IsEmpty = 1;
        }
        else if (txtEmailAddress.Text == String.Empty)
        {
            lblMsg.Text = "Please complete all field with (*)";
            IsEmpty = 1;
        }
        else if (txtContact.Text == String.Empty)
        {
            lblMsg.Text = "Please complete all field with (*)";
            IsEmpty = 1;
        }
        else if (txtPassword.Text == String.Empty)
        {
            lblMsg.Text = "Please complete all field with (*)";
            IsEmpty = 1;
        }
        else if (txtConfirmPswd.Text == String.Empty)
        {
            lblMsg.Text = "Please complete all field with (*)";
            IsEmpty = 1;
        }
        return IsEmpty;
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

    void SendMail(string Name, string Email)
    {
        try
        {
            bool adminVal = false;
            bool UserVal = false;
            string AdminEmail = "gokul.c@strat-agile.com";
            if (AdminEmail.ToString() == "" || AdminEmail.ToString() == null)
            {
                adminVal = false;
            }
            else
            {
                adminVal = true;
                string AdminEmailSubject = "";
                string AdminEmailBody = Tools.GetEmailBody("Registration mail to Admin", out AdminEmailSubject);
                AdminEmailBody = AdminEmailBody.Replace("[Name]", Name);
                AdminEmailBody = AdminEmailBody.Replace("[Email]", Email);
                List<string> Attachments = new List<string>();
                adminVal = Tools.Pushmail(AdminEmail, AdminEmailSubject, AdminEmailBody, Attachments);
                if (adminVal == true)
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
                string UserEmailSubject = "Home And Me | New user registration";
                string UserEmailBody = Tools.GetEmailBody("Registration mail to User", out UserEmailSubject);
                UserEmailBody = UserEmailBody.Replace("[Name]", Name);
                List<string> AttachmentsUser = new List<string>();
                UserVal = Tools.Pushmail(Email, UserEmailSubject, UserEmailBody, AttachmentsUser);
                if (UserVal == true)
                {
                    Tools.EmailLogTrail(Email, UserEmailSubject, UserEmailBody, "", "");
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void lnkFBLogin_Click(object sender, EventArgs e)
    {
        try
        {
            string FacebookClientID = ConfigurationManager.AppSettings["FacebookClientID"].ToString();
            string FacebookClientSecretKey = ConfigurationManager.AppSettings["FacebookClientSecretKey"].ToString();
            string Redirection_URL = ConfigurationManager.AppSettings["FacebookRedirectUrl"].ToString();

            string Url = "https://graph.facebook.com/oauth/authorize?client_id=" + FacebookClientID + "&redirect_uri=" + Redirection_URL + "&scope=public_profile,email";
            Response.Redirect(Url);
        }
        catch (Exception eX) { }
    }
}