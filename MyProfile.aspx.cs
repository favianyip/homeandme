using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class MyProfile : System.Web.UI.Page
{
    string ErrorIfAny = String.Empty;
    string UserID = String.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            if (Session["UserID"] != null && Session["UserID"] != "")
            {
                UserID = Session["UserID"].ToString();
            }
            else
            {
                Response.Redirect("/Home.aspx");
            }
            if (!IsPostBack)
            {
                GetUserProfile(UserID);
            }
        }
        catch (Exception ex) { }
    }

    void GetUserProfile(string UserID)
    {
        try
        {
            string FullName = String.Empty;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetUserProfileByID @UserID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("UserID", UserID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                if (DS.Tables[0].Rows.Count > 0)
                {
                    lblName.Text = DS.Tables[0].Rows[0]["Name"].ToString();
                    lblEmail.Text = DS.Tables[0].Rows[0]["Email"].ToString();
                    txtEmail.Text = DS.Tables[0].Rows[0]["Email"].ToString();
                    FullName = DS.Tables[0].Rows[0]["Name"].ToString();
                    string[] FullNameSplit = FullName.Split(' ');
                    txtFirstName.Text = FullNameSplit[0].ToString().Trim();
                    if (FullNameSplit.Length > 1)
                    {
                        txtLastName.Text = FullNameSplit[1].ToString().Trim();
                    }
                    else
                    {
                        txtLastName.Text = String.Empty;
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void lnkChangePassword_Click(object sender, EventArgs e)
    {
        try
        {
            DivPassword.Visible = true;
            DivAccountInfo.Visible = false;
            lblMsg.Visible = false;
        }
        catch (Exception ex) { }
    }

    protected void lnkEditAccount_Click(object sender, EventArgs e)
    {
        try
        {
            DivPassword.Visible = false;
            DivAccountInfo.Visible = true;
            lblMsg.Visible = false;
        }
        catch (Exception ex) { }
    }

    protected void btnUpdatePassword_Click(object sender, EventArgs e)
    {
        try
        {
            DataSet DS = new DataSet();
            if (GetOldPassword() == txtCurrentPassword.Text.ToString().Trim())
            {
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "UPDATE Users SET Email = @Email, Password = @Password WHERE UserID = @UserID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("UserID", UserID));
                    SqlParameters.Add(new SqlParameter("Email", txtEmail.Text.ToString().Trim()));
                    SqlParameters.Add(new SqlParameter("Password", txtConfirmPassword.Text.ToString().Trim()));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                {
                    DivPassword.Visible = false;
                    DivAccountInfo.Visible = false;
                    GetUserProfile(UserID);
                }
                else
                {
                    DivPassword.Visible = true;
                    DivAccountInfo.Visible = false;
                }
                lblMsg.Visible = false;
            }
            else
            {
                lblMsg.Visible = true;
                lblMsg.Text = "Current password is incorrect!";
            }
        }
        catch (Exception eX) { }
    }

    string GetOldPassword()
    {
        string Password = String.Empty;
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT Password FROM Users WHERE UserID = @UserID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("UserID", UserID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                if (DS.Tables[0].Rows.Count > 0)
                {
                    Password = DS.Tables[0].Rows[0]["Password"].ToString();
                }
            }
        }
        catch (Exception ex) { }
        return Password;
    }

    protected void btnSubmit_Click(object sender, EventArgs e)
    {
        try
        {
            string UserName = String.Empty;
            UserName = txtFirstName.Text.ToString().Trim() + ' ' + txtLastName.Text.ToString().Trim();

            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UPDATE Users SET Name = @Name WHERE UserID = @UserID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("UserID", UserID));
                SqlParameters.Add(new SqlParameter("Name", UserName));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                DivPassword.Visible = false;
                DivAccountInfo.Visible = false;
                GetUserProfile(UserID);
            }
            else
            {
                DivPassword.Visible = false;
                DivAccountInfo.Visible = true;
            }
        }
        catch (Exception ex) { }
    }
}