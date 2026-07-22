using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_MyProfile : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session[Tools.SessionVariables.AdminUserID] != null)
        {
            if (!IsPostBack)
            {
                string err = "";
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "Select * From AdminUsers Where AdminUserID = @AdminUserID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("AdminUserID", Session[Tools.SessionVariables.AdminUserID].ToString().Trim()));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                DataSet ds = new DataSet("ds");
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    if (ds.Tables[0].Rows.Count > 0)
                    {
                        txtEmail.Text = ds.Tables[0].Rows[0]["Email"].ToString().Trim();
                        txtName.Text = ds.Tables[0].Rows[0]["Name"].ToString().Trim();
                        txtAddress.Text = ds.Tables[0].Rows[0]["Address"].ToString().Trim();
                        txtPostCode.Text = ds.Tables[0].Rows[0]["PostCode"].ToString().Trim();
                        txtMobile.Text = ds.Tables[0].Rows[0]["Mobile"].ToString().Trim();
                        txtPhone.Text = ds.Tables[0].Rows[0]["HomeTelephone"].ToString().Trim();
                    }
                }
            }
        }
        else
            Response.Redirect("login.aspx");
    }

    protected void btnSave_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UPDATE AdminUsers SET Name = @Name, Email =  @Email, Address = @Address, Mobile = @Mobile, " +
                                            "HomeTelephone = @HomeTelephone, PostCode = @PostCode WHERE AdminUserID = @AdminUserID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("Name", txtName.Text.Trim()));
                SqlParameters.Add(new SqlParameter("Email", txtEmail.Text.Trim()));
                SqlParameters.Add(new SqlParameter("Address", txtAddress.Text.Trim()));
                SqlParameters.Add(new SqlParameter("Mobile", txtMobile.Text.Trim()));
                SqlParameters.Add(new SqlParameter("HomeTelephone", txtPhone.Text.Trim()));
                SqlParameters.Add(new SqlParameter("PostCode", txtPostCode.Text.Trim()));
                SqlParameters.Add(new SqlParameter("AdminUserID", Session[Tools.SessionVariables.AdminUserID]));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.ExecuteSQL(SQLCommands, out err))
            {
                Tools.AdminLogTrail(Session[Tools.SessionVariables.AdminUserID].ToString().Trim(), "Edit details for admin user - " + txtName.Text.Trim());
                ErrorDisplay.ShowAlertMessage("Successfully Updated.");
            }
            else
            {
                ErrorDisplay.ShowAlertMessage("Error Found.");
            }
        }
        catch (Exception eX) { }
    }
}