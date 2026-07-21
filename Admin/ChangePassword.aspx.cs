using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_ChangePassword : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session[Tools.SessionVariables.AdminUserID] != null)
        {
        }
        else
            Response.Redirect("../logout.aspx");
    }

    protected void btnChangePassword_Click(object sender, EventArgs e)
    {
        try
        {
            if (txtNewPasword.Text.Trim() == txtConfirm.Text.Trim())
            {
                string err = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "Select * From AdminUsers Where AdminUserID = @AdminUserID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("AdminUserID", Session[Tools.SessionVariables.AdminUserID].ToString().Trim()));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    if (ds.Tables[0].Rows.Count > 0)
                    {
                        if (txtCurrentPassword.Text.Trim() == ds.Tables[0].Rows[0]["Password"].ToString().Trim())
                        {
                            SQLCommands = new List<Tools.SqlContainer>();
                            {
                                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                                SQLContainer.Query = "Update AdminUsers Set Password = @Password Where AdminUserID = @AdminUserID";
                                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                                SqlParameters.Add(new SqlParameter("Password", txtNewPasword.Text.Trim()));
                                SqlParameters.Add(new SqlParameter("AdminUserID", Session[Tools.SessionVariables.AdminUserID].ToString().Trim()));
                                SQLContainer.SqlParameters = SqlParameters;
                                SQLCommands.Add(SQLContainer);
                            }
                            if (Tools.ExecuteSQL(SQLCommands, out err))
                            {
                                ErrorDisplay.ShowAlertMessage("Your password is updated.");
                                Tools.AdminLogTrail(Session[Tools.SessionVariables.AdminUserID].ToString().Trim(), "Changed login Password");
                                txtConfirm.Text = String.Empty;
                                txtCurrentPassword.Text = String.Empty;
                                txtNewPasword.Text = String.Empty;
                            }
                            else
                                ErrorDisplay.ShowAlertMessage("Error found!");
                        }
                        else
                            ErrorDisplay.ShowAlertMessage("Please enter correct password.");
                    }
                }
            }
            else
                ErrorDisplay.ShowAlertMessage("Passwords Mismatch!");
        }
        catch (Exception eX) { }
    }
}