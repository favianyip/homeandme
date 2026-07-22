using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        Session["MenuID"] = "";
    }

    void ClearControls()
    {
        txtEmail.Text = String.Empty;
        txtPassword.Text = String.Empty;
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
                SQLContainer.Query = "GetUserByID @Email";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("Email", txtEmail.Text.Trim()));
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
                        Session["UserTypeID"] = Convert.ToString(DS.Tables[0].Rows[0]["RoleID"]);
                        Session[Tools.SessionVariables.UserID] = "";
                        Session[Tools.SessionVariables.AdminUserID] = myID;
                        if (Convert.ToString(Session["UserTypeID"]) == "1")
                        {
                            Response.Redirect("Admin/AdminDashboard.aspx");
                        }
                        else
                        {
                            Response.Redirect("Admin/AdminDashboard.aspx");
                        }
                        ClearControls();
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
                ErrorDisplay.ShowAlertMessage("Enter valid login credentials.");
            }
        }
        catch (Exception eX) { }
    }
}