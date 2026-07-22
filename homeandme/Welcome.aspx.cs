using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Welcome : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        Page.Title = Tools.GetConfigValue(Tools.KeyVariables.SiteTitle);
        if (Session["IsCaptchaSolved"] == null)
        {
            Session["RetrunLocationAfterCaptcha"] = "Welcome";
            Response.Redirect("~/securitycheck.aspx");
        }
    }

    protected void btnLogin_Click(object sender, EventArgs e)
    {
        try
        {
            string myID = "-1";
            string ErrorIfAny = string.Empty;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT Password, AdminUserID FROM AdminUsers WHERE Name = @Name";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("Name", txtUser.Text.Trim()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                if (DS.Tables[0].Rows.Count > 0)
                {
                    if (txtPassword.Text.Trim().Equals(DS.Tables[0].Rows[0]["Password"].ToString().Trim()))
                    {
                        myID = DS.Tables[0].Rows[0]["AdminUserID"].ToString().Trim();
                        Session[Tools.SessionVariables.AuthorisationID] = myID;
                        Response.Redirect("Home.aspx");
                    }
                    else
                    {
                        ErrorDisplay.ShowAlertMessage("Password mismatch.");
                    }
                }
                else
                {
                    ErrorDisplay.ShowAlertMessage("The requested user profile is not found.");
                }
            }
            else
            {
                ErrorDisplay.ShowAlertMessage("Enter valid login credentials");
            }
        }
        catch (Exception eX) { }
    }
}