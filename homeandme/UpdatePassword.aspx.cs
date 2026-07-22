using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class UpdatePassword : System.Web.UI.Page
{
    string ErrorIfAny = String.Empty;
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Request.QueryString["utoken"] == "" || Request.QueryString["utoken"] == null)
        {
            Response.Redirect("Login.aspx");
        }
    }

    protected void lnkSubmit_Click(object sender, EventArgs e)
    {
        string userToken = Convert.ToString(Request.QueryString["utoken"]);
        DataSet dS = new DataSet();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "UpdatePassowordByToken @Token, @Password";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("@Token", userToken));
            SqlParameters.Add(new SqlParameter("@Password", txtConfirmPassword.Text.Trim()));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out dS, out ErrorIfAny))
        {
            string Name = Convert.ToString(dS.Tables[0].Rows[0]["Name"]);
            string Email = Convert.ToString(dS.Tables[0].Rows[0]["Email"]);
            sendMail(Name.ToString(), Email.ToString());
            divpopUpbtn.Visible = true;
            lblMessage.Text = "Password Updated Successfully.";
            ScriptManager.RegisterStartupScript(this.Page, this.GetType(), "script", "openMessageModal();", true);
        }
        else
        {
            divpopUpbtn.Visible = false;
            lblMessage.Text = "Something Went Wrong. Please try Again.";
            ScriptManager.RegisterStartupScript(this.Page, this.GetType(), "script", "openMessageModal();", true);
        }
    }

    //Password Update mail
    protected void sendMail(string Name, string Email)
    {
        try
        {
            bool Val = false;
            if (Email.ToString() == "" || Email.ToString() == null)
            {
                Val = false;
            }
            else
            {
                Val = true;
                string EmailSubject;
                string EmailBody = Tools.GetEmailBody("After Password Reset", out EmailSubject);
                EmailBody = EmailBody.Replace("[username]", Email);
                List<string> AttachmentsUser = new List<string>();
                Val = Tools.Pushmail(Email, EmailSubject, EmailBody, AttachmentsUser);
                if (Val == true)
                {
                    Tools.EmailLogTrail(Email, EmailSubject, EmailBody, "", "");
                }
            }
        }
        catch (Exception eX) { }
    }
}