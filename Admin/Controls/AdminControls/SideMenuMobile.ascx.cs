using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_Controls_AdminControls_SideMenuMobile : System.Web.UI.UserControl
{
    StringBuilder sbMenu = new StringBuilder();
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session[Tools.SessionVariables.AdminUserID] == "" || Session[Tools.SessionVariables.AdminUserID] == null)
        {
            Response.Redirect("../Admin.aspx");
        }
        if (!IsPostBack)
        {
            GetUserDetails();
            GetMenuItems(0);
        }
    }


    private void GetMenuItems(int RoleID)
    {
        string err = "";
        sbMenu = new StringBuilder();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "dbo.Usp_GetMenuItemsByRole @AdminUserId, @MenuID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("AdminUserId", Session[Tools.SessionVariables.AdminUserID].ToString()));
            SqlParameters.Add(new SqlParameter("MenuID", DBNull.Value));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        DataSet ds = new DataSet("ds");
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            if (ds != null && ds.Tables.Count > 0)
            {
                if (ds.Tables[0] != null && ds.Tables[0].Rows.Count > 0)
                {
                    DataTable ParentMenus = (from mnuParent in ds.Tables[0].AsEnumerable()
                                             where mnuParent.Field<int>("ParentID").Equals(0)
                                             orderby mnuParent.Field<int>("SortOrder")
                                             select mnuParent).CopyToDataTable();

                    if (ParentMenus != null && ParentMenus.Rows.Count > 0)
                    {
                        foreach (DataRow drMenu in ParentMenus.Rows)
                        {
                            sbMenu.Append("<li id = \"li" + drMenu["MenuName"].ToString() + "\" runat = \"server\" >");
                            if (drMenu["MenuItem"].ToString() == "0")
                            {
                                sbMenu.Append(" <a href=\"#\"  class='menu'><div class='menu__icon'><i data-feather='" + drMenu["ImagePath"].ToString() + "'></i></div><div class='menu__title'>" + drMenu["MenuName"].ToString() + "<i data-feather= 'chevron-down' class='menu__sub-icon'></i></div></a>");
                                BindChildMenu(drMenu["MenuID"].ToString(), drMenu["MenuName"].ToString(), ds.Tables[0]);
                            }
                            else
                            {
                                sbMenu.Append("<a href=\"" + drMenu["Url"].ToString() + "\" class='menu'><div class='menu__icon'><i data-feather=\"" + drMenu["ImagePath"].ToString() + "\"></i></div><div class='menu__title'>" + drMenu["MenuName"].ToString() + "</div></a>");
                            }
                            sbMenu.Append(" </li>");
                        }
                        litMobileMenu.Text = sbMenu.ToString();
                    }
                }
            }
        }
    }

    private void BindChildMenu(String MenuId, String MenuName, DataTable dtMenu)
    {
        DataTable dtChild = new DataTable();
        var ChildMenus = (from mnuChild in dtMenu.AsEnumerable()
                          where mnuChild.Field<int>("ParentID").Equals(Convert.ToInt32(MenuId))
                          orderby mnuChild.Field<int>("SortOrder")
                          select mnuChild);

        if (ChildMenus != null && ChildMenus.Count() > 0)
        {
            dtChild = ChildMenus.CopyToDataTable();
        }

        if (dtChild != null && dtChild.Rows.Count > 0)
        {
            sbMenu.Append("<ul class='' id=\"ul" + MenuName + "\" runat=\"server\">");
            foreach (DataRow drMenu in dtChild.Rows)
            {
                sbMenu.Append("<li id=\"li" + drMenu["MenuName"].ToString() + "\" runat=\"server\"><a href=\"" + drMenu["Url"].ToString() + "\"  class='menu'> <div class='menu__icon'><i data-feather='" + drMenu["ImagePath"].ToString() + "'></i></div><div class='menu__title'>" + drMenu["MenuName"].ToString() + "</div></a></li>");
                LoadMenuUrl(drMenu["Url"].ToString(), MenuName, drMenu["MenuName"].ToString());
            }
            sbMenu.Append("</ul>");
        }
    }

    void LoadMenuUrl(String url, String MainMenu, String SubMenu)
    {
        string CurrentURL = HttpContext.Current.Request.Url.AbsoluteUri.ToString().ToLower();
    }

    private void GetUserDetails()
    {
        try
        {
            DataSet ds = new DataSet("ds");
            string ErrorIfAny = "";
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM AdminUsers WHERE AdminUserID = @AdminUserID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("AdminUserID", Session[Tools.SessionVariables.AdminUserID]));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                if (ds.Tables[0].Rows.Count > 0) { }
            }
        }
        catch (Exception eX) { }
    }
}