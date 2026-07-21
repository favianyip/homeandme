using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_ManageAdminUsers : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        BindData();
    }

    private static string GeneratePassword()
    {
        int length = 8;
        string allowedChars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ023456789";
        Random randNum = new Random();
        char[] chars = new char[length];
        int allowedCharCount = allowedChars.Length;
        for (int i = 0; i < length; i++)
            chars[i] = allowedChars[(int)((allowedChars.Length) * randNum.NextDouble())];
        return new string(chars);
    }

    void ClearControls()
    {
        try
        {
            txtName.Text = String.Empty;
            txtUserEmail.Text = String.Empty;
            txtMobile.Text = String.Empty;
        }
        catch (Exception eX) { }
    }

    void BindData()
    {
        GridUsers.DataBind();
    }

    protected void btnAddNew_Click(object sender, EventArgs e)
    {
        try
        {
            hdnUserID.Value = "-1";
            divUserGrid.Visible = false;
            divUserForm.Visible = true;
            btnAddNew.Visible = false;
            txtUserEmail.ReadOnly = false;
            ClearControls();
        }
        catch (Exception eX) { }
    }

    protected void lnkEdit_Click(object sender, EventArgs e)
    {
        try
        {
            string id = ((LinkButton)sender).CommandArgument;
            hdnUserID.Value = id.ToString();
            //txtUserID.Text = id;
            divUserGrid.Visible = false;
            divUserForm.Visible = true;
            btnAddNew.Visible = false;
            txtUserEmail.ReadOnly = true;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM AdminUsers WHERE AdminUserID = @AdminUserID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("AdminUserID", id));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                txtName.Text = ds.Tables[0].Rows[0]["Name"].ToString().Trim();
                txtUserEmail.Text = ds.Tables[0].Rows[0]["Email"].ToString().Trim();
                txtMobile.Text = ds.Tables[0].Rows[0]["Mobile"].ToString().Trim();
            }
        }
        catch (Exception eX) { }
    }

    protected void btnSaveUsers_Click(object sender, EventArgs e)
    {
        try
        {
            if (hdnUserID.Value != "-1")
            {
                string err = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "UpdateUserData @Name ,@Email,@Mobile, @AdminUserID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("Name", txtName.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("Email", txtUserEmail.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("Mobile", txtMobile.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("AdminUserID", hdnUserID.Value));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.ExecuteSQL(SQLCommands, out err))
                {
                    divUserForm.Visible = false;
                    divUserGrid.Visible = true;
                    btnAddNew.Visible = true;
                    ClearControls();
                    BindData();
                    Tools.AdminLogTrail(Session[Tools.SessionVariables.AdminUserID].ToString().Trim(), "Edit details for admin user - " + txtName.Text.Trim());
                    ErrorDisplay.ShowAlertMessage("Admin user details are updated.");
                }
                else
                {
                    ErrorDisplay.ShowAlertMessage("Error found.");
                }
            }
            else
            {
                string pass = GeneratePassword();
                string err = "";
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "CreateAdminUser @Name, @Email, @Mobile, @Password, @CreatedBy";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("Name", txtName.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("Email", txtUserEmail.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("Mobile", txtMobile.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("Password", pass.ToString()));
                    SqlParameters.Add(new SqlParameter("CreatedBy", Session[Tools.SessionVariables.AdminUserID].ToString().Trim()));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                DataSet ds = new DataSet("ds");
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    Tools.AdminLogTrail(Session[Tools.SessionVariables.AdminUserID].ToString().Trim(), "Created new admin user - " + txtName.Text.Trim() + ", " + txtUserEmail.Text.Trim());
                    divUserForm.Visible = false;
                    divUserGrid.Visible = true;
                    btnAddNew.Visible = true;
                    ClearControls();
                    BindData();
                    ErrorDisplay.ShowAlertMessage("Successfully Completed.");
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        try
        {
            divUserGrid.Visible = true;
            divUserForm.Visible = false;
            btnAddNew.Visible = true;
            ClearControls();
        }
        catch (Exception eX) { }
    }

    protected void lnkResetPassword_Click(object sender, EventArgs e)
    {
        try
        {
            string id = ((LinkButton)sender).CommandArgument;
            hdnAdminUserID.Value = id.ToString();
            txtPassword.Text = string.Empty;
            txtConfirmPassword.Text = string.Empty;
            lblPasswordMessage.Text = "";
            popReset.ShowOnPageLoad = true;
        }
        catch (Exception eX) { }
    }

    protected void btnPasswordUpdate_Click(object sender, EventArgs e)
    {
        try
        {
            string err = String.Empty;
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UPDATE AdminUsers SET Password = @Password WHERE AdminUserID = @AdminUserID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("Password", txtPassword.Text.Trim()));
                SqlParameters.Add(new SqlParameter("AdminUserID", hdnAdminUserID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            DataSet ds = new DataSet("ds");
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                txtPassword.Text = string.Empty;
                txtConfirmPassword.Text = string.Empty;
                lblPasswordMessage.Text = "Password Successfully Updated.";
            }
            else
            {
                lblPasswordMessage.Text = "Something went wrong. Please try again later.";
            }
        }
        catch (Exception eX) { }
    }
}