using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_Controls_Admincontrols_AccountMenu : System.Web.UI.UserControl
{
    string ErrorIfAny = String.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        DisplayAdminUserData();
        if (Convert.ToString(Session["UserTypeID"]) == "2")
        {
            divWebShopbtn.Visible = true;
        }
        else
        {
            divWebShopbtn.Visible = false;
        }
    }

    void DisplayAdminUserData()
    {
        try
        {
            if (Session[Tools.SessionVariables.AdminUserID] != null)
            {
                DataSet ds = new DataSet();
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "GetAdminUserDetails @AdminUserID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("AdminUserID", Session[Tools.SessionVariables.AdminUserID].ToString()));

                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                {
                    if (ds.Tables[0].Rows.Count > 0)
                    {
                        lblName.Text = ds.Tables[0].Rows[0]["GivenName"].ToString();
                        lblRole.Text = ds.Tables[0].Rows[0]["Role"].ToString();
                    }
                }
            }
            else
            {
                Response.Redirect(ConfigurationManager.AppSettings["Baseurl"] + "Login.aspx");
            }
        }
        catch (Exception ex)
        { }
    }

    protected void lnkMyProfile_Click(object sender, EventArgs e)
    {
        try
        {
            Session["MenuID"] = "";
            Response.Redirect("Myprofile.aspx");
        }
        catch (Exception eX) { }
    }

    protected void lnkResetPassword_Click(object sender, EventArgs e)
    {
        try
        {
            Session["MenuID"] = "";
            Response.Redirect("ChangePassword.aspx");
        }
        catch (Exception eX) { }
    }

    protected void btnWebShop_Click(object sender, EventArgs e)
    {
        try
        {
            Response.Redirect("ProductListing.aspx");
        }
        catch (Exception eX) { }
    }
}