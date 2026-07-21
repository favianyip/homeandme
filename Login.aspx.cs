using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Login : System.Web.UI.Page
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
        txtEmailAddress.Text = String.Empty;
        txtPassword.Text = String.Empty;
        lblMsg.Text = String.Empty;
    }

    protected void lnkLogin_Click(object sender, EventArgs e)
    {
        try
        {
            string UserID = "-1";
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM Users WHERE Email = @Email AND Status = 1";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("Email", txtEmailAddress.Text.ToString().Trim()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                if (DS.Tables[0].Rows.Count > 0)
                {
                    if (txtPassword.Text.Trim().Equals(DS.Tables[0].Rows[0]["Password"].ToString().Trim()))
                    {
                        UserID = DS.Tables[0].Rows[0]["UserID"].ToString().Trim();
                        Session["UserID"] = UserID;
                        ClearControls();
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
                    else
                    {
                        lblMsg.Text = "Password mismatch.";
                    }
                }
                else
                {
                    lblMsg.Text = "Enter valid login credentials.";
                }
            }
            else
            {
                lblMsg.Text = "Error found.Please try again.";
            }
        }
        catch (Exception eX) { }
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

    protected void lnkFacebookLogin_Click(object sender, EventArgs e)
    {
        try
        {
            string FacebookClientID = ConfigurationManager.AppSettings["FacebookClientID"].ToString();
            string FacebookClientSecretKey = ConfigurationManager.AppSettings["FacebookClientSecretKey"].ToString();
            string Redirection_URL = ConfigurationManager.AppSettings["FacebookRedirectUrl"].ToString();

            string Url = "https://graph.facebook.com/oauth/authorize?client_id=" + FacebookClientID + "&redirect_uri=" + Redirection_URL + "&scope=public_profile,email";
            Response.Redirect(Url);
        }
        catch (Exception ex) { }
    }
}