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

public partial class Admin_Controls_AdminControls_SideMenu : System.Web.UI.UserControl
{
    StringBuilder sbMenu = new StringBuilder();
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session[Tools.SessionVariables.AdminUserID] == "" || Session[Tools.SessionVariables.AdminUserID] == null)
        {
            Response.Redirect("../Admin.aspx");
        }
        GetUserDetails();
        GetMenuItems(0);
    }


    private void GetMenuItems(int RoleID)
    {
        try
        {
            string err = "";
            sbMenu = new StringBuilder();
            List<Tools.SqlContainer> SQLCommandsSite = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainerSite = new Tools.SqlContainer();
                SQLContainerSite.Query = "Usp_GetMenuItemsByRole @AdminUserId, @MenuID";
                List<SqlParameter> SqlParametersSite = new List<SqlParameter>();
                SqlParametersSite.Add(new SqlParameter("AdminUserId", Session[Tools.SessionVariables.AdminUserID].ToString()));
                if (Session["MenuID"] != "")
                {
                    SqlParametersSite.Add(new SqlParameter("MenuID", Convert.ToInt32(Session["MenuID"])));
                }
                else
                {
                    SqlParametersSite.Add(new SqlParameter("MenuID", DBNull.Value));
                }
                SQLContainerSite.SqlParameters = SqlParametersSite;
                SQLCommandsSite.Add(SQLContainerSite);
            }
            DataSet ds = new DataSet("ds");
            if (Tools.GetData(SQLCommandsSite, out ds, out err))
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
                                litMainMenu.Controls.Add(new LiteralControl("<li id ='li" + drMenu["MenuName"].ToString() + "' runat='server' >"));
                                if (drMenu["MenuItem"].ToString() == "0")
                                {
                                    litMainMenu.Controls.Add(new LiteralControl("<a href='#'  class='" + drMenu["MainMenuClass"].ToString() + "'><div class='side-menu__icon'><i data-feather='" + drMenu["ImagePath"].ToString() + "'></i></div><div class='side-menu__title'>" + drMenu["MenuName"].ToString() + "<i data-feather='chevron-down' class='side-menu__sub-icon'></i></div></a>"));
                                    BindChildMenu(drMenu["MenuID"].ToString(), drMenu["MenuName"].ToString(), ds.Tables[0], drMenu["UlClass"].ToString());
                                }
                                else
                                {
                                    Literal literal = new Literal();
                                    literal.Text = "<div class='side-menu__icon'><i data-feather='" + drMenu["ImagePath"].ToString() + "'></i></div><div class='side-menu__title'>" + drMenu["MenuName"].ToString() + "</div>";
                                    LinkButton lnkMainMenu = new LinkButton();
                                    lnkMainMenu.ClientIDMode = ClientIDMode.Static;
                                    lnkMainMenu.Click += new EventHandler(LinkClickedMain);
                                    lnkMainMenu.ID = drMenu["MenuID"].ToString();
                                    lnkMainMenu.CssClass = drMenu["MainMenuClass"].ToString();
                                    lnkMainMenu.Controls.Add(literal);
                                    lnkMainMenu.CommandArgument = drMenu["Url"].ToString();
                                    litMainMenu.Controls.Add(lnkMainMenu);
                                }
                                litMainMenu.Controls.Add(new LiteralControl("</li>"));
                            }
                        }
                    }
                }
            }
            else
            {
                throw new Exception(err);
            }
        }
        catch (Exception eX) { }
    }

    private void BindChildMenu(String MenuId, String MenuName, DataTable dtMenu, string UlClass)
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
            litMainMenu.Controls.Add(new LiteralControl("<ul class='" + UlClass + "' id='ul" + MenuName + "'>"));
            foreach (DataRow drMenu in dtChild.Rows)
            {
                litMainMenu.Controls.Add(new LiteralControl("<li id='li" + drMenu["MenuName"].ToString() + "' runat='server'>"));
                Literal literal = new Literal();
                literal.Text = "<div class='side-menu__icon'><i data-feather='" + drMenu["ImagePath"].ToString() + "'></i></div><div class='side-menu__title'> " + drMenu["MenuName"].ToString() + "</div>";
                LinkButton lnkSubMenu = new LinkButton();
                lnkSubMenu.ClientIDMode = ClientIDMode.Static;
                lnkSubMenu.Click += new EventHandler(LinkClickedSubMain);
                lnkSubMenu.ID = drMenu["MenuID"].ToString();
                lnkSubMenu.CssClass = drMenu["SUbMenuClass"].ToString();
                lnkSubMenu.Controls.Add(literal);
                lnkSubMenu.CommandArgument = drMenu["Url"].ToString();
                lnkSubMenu.CommandName = MenuName.ToString();
                litMainMenu.Controls.Add(lnkSubMenu);
                litMainMenu.Controls.Add(new LiteralControl("</li>"));
                LoadMenuUrl(drMenu["Url"].ToString(), MenuName, drMenu["MenuName"].ToString());
            }
            litMainMenu.Controls.Add(new LiteralControl("</ul>"));
        }
    }

    protected void LinkClickedSubMain(object sender, EventArgs e)
    {
        try
        {
            var obj = ((LinkButton)sender);
            int id = Convert.ToInt32(((LinkButton)sender).ID);
            string Url = Convert.ToString(((LinkButton)sender).CommandArgument);
            string Name = Convert.ToString(((LinkButton)sender).CommandName);
            Session["OldMenuId"] = Session["MenuID"].ToString();
            Session["MenuID"] = id.ToString();
            if (Url == "#")
            {
                Session["MenuID"] = Session["OldMenuId"].ToString();
                Response.Redirect(Request.RawUrl);
            }
            else
            {
                Response.Redirect(Url);
            }
        }
        catch (Exception eX) { }
    }

    protected void LinkClickedMain(object sender, EventArgs e)
    {
        try
        {
            var obj = ((LinkButton)sender);
            int id = Convert.ToInt32(((LinkButton)sender).ID);
            string Url = Convert.ToString(((LinkButton)sender).CommandArgument);
            Session["OldMenuId"] = Session["MenuID"].ToString();
            Session["MenuID"] = id.ToString();
            if (Url == "#")
            {
                Session["MenuID"] = Session["OldMenuId"].ToString();
                Response.Redirect(Request.RawUrl);
            }
            else
            {
                Response.Redirect(Url);
            }
        }
        catch (Exception eX) { }
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