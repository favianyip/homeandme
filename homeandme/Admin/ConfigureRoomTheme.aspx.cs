using DevExpress.Web;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_ConfigureRoomTheme : System.Web.UI.Page
{
    string ThemeID = string.Empty;
    string RoomID = string.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            if (Session["ThemeID"] == null)
            {
                Response.Redirect("/Admin/ManageThemeSettings.aspx");
            }
            else
            {
                ThemeID = Session["ThemeID"].ToString();
                if (Session["RoomID"] != null)
                {
                    RoomID = Session["RoomID"].ToString();
                }
                if (!IsPostBack)
                {
                    ReloadControl();
                }
            }
        }
        catch (Exception ex)
        { }
    }

    public void ReloadControl()
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "LoadScopesForThemeConfiguration @RoomID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("RoomID", RoomID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                cmbScopes.DataSource = ds.Tables[0];
                cmbScopes.DataBind();
                cmbScopes.SelectedIndex = cmbScopes.Items.IndexOf(cmbScopes.Items.FindByValue(Convert.ToString("-1")));
            }
        }
        catch (Exception eX) { }
    }

    protected void cmbScopes_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "LoadOptionsByScopesForThemeConfig @RoomID, @ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("RoomID", RoomID));
                SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                DivOptions.Visible = true;
                cmbOptions.DataSource = ds.Tables[0];
                cmbOptions.DataBind();
                cmbOptions.SelectedIndex = cmbOptions.Items.IndexOf(cmbOptions.Items.FindByValue(Convert.ToString(ds.Tables[0].Rows[0]["Option"])));
                Session["ScopeID"] = Convert.ToString(cmbScopes.SelectedItem.Value);
            }
        }
        catch (Exception eX) { }
    }

    int CheckAssignedTypesForThemes()
    {
        int IsHavingData = 0;
        string err = "";
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "GetThemeConfigurationsListing @RoomID, @ScopeID, @ThemeID, @OptionID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("RoomID", RoomID));
            SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
            SqlParameters.Add(new SqlParameter("ThemeID", ThemeID));
            SqlParameters.Add(new SqlParameter("OptionID", cmbOptions.SelectedItem.Value));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                IsHavingData = 1;
            }
        }
        return IsHavingData;
    }

    protected void BindData()
    {
        GridAssignedThemeOptions.DataBind();
        GridThemeOptions.DataBind();
    }

    protected void btnAssign_Click(object sender, EventArgs e)
    {
        try
        {
            string RoomId = RoomID;
            string ThemeId = ThemeID;
            string ErrorIfAny = string.Empty;
            List<object> ids = new List<object>();
            ids = GridThemeOptions.GetSelectedFieldValues("SubsubOptionL3ID");

            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            foreach (object id in ids)
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "InsertThemeConfiguration @ThemeID, @RoomID, @SubsubOptionL3ID, @ScopeID, @OptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ThemeID", ThemeId));
                SqlParameters.Add(new SqlParameter("RoomID", RoomId));
                SqlParameters.Add(new SqlParameter("SubsubOptionL3ID", id));
                SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("OptionID", cmbOptions.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.ExecuteSQL(SQLCommands, out ErrorIfAny))
            {
                lblMsg.Text = "Error while assigning the work type, please try again.";
            }
            else
            {
                lblMsg.Text = "";
                BindData();
                GridThemeOptions.Selection.UnselectAll();
            }
        }
        catch (Exception eX) { }
    }

    protected void btnRemove_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            string ThemeConfigureID = ((LinkButton)sender).CommandArgument;
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "DELETE FROM ThemeConfiguration WHERE ThemeConfigureID =  @ThemeConfigureID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ThemeConfigureID", ThemeConfigureID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            Tools.ExecuteSQL(SQLCommands, out err);
            BindData();
        }
        catch (Exception ex) { }
    }

    protected void cmbOptions_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetSubOptionListingByOptionsForThemes @ScopeID, @OptionID, @RoomID, @ThemeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("OptionID", cmbOptions.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("RoomID", RoomID));
                SqlParameters.Add(new SqlParameter("ThemeID", ThemeID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    divThemeGrid.Visible = true;
                    lblMsg.Text = "";
                    Session["OptionID"] = Convert.ToString(cmbOptions.SelectedItem.Value);
                    GridThemeOptions.DataBind();
                }
                else
                {
                    if (CheckAssignedTypesForThemes() == 0)
                    {
                        divThemeGrid.Visible = false;
                        lblMsg.Text = "No work type assigned in this room section";
                    }
                    else
                    {
                        divThemeGrid.Visible = true;
                        lblMsg.Text = "";
                        Session["OptionID"] = Convert.ToString(cmbOptions.SelectedItem.Value);
                        GridThemeOptions.DataBind();
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void chkSetDefault_CheckedChanged(object sender, EventArgs e)
    {
        try
        {
            ASPxCheckBox chkDefault = (ASPxCheckBox)sender;
            string ThemeConfigureID = chkDefault.ToolTip;
            int IsDefault = 0;
            if (chkDefault.Checked == true)
            {
                IsDefault = 1;
            }

            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SetThemeConfigurationDefault @ThemeConfigureID, @IsDefault, @ThemeID, @OptionID, @ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ThemeConfigureID", ThemeConfigureID));
                SqlParameters.Add(new SqlParameter("IsDefault", IsDefault));
                SqlParameters.Add(new SqlParameter("ThemeID", ThemeID));
                SqlParameters.Add(new SqlParameter("OptionID", cmbOptions.SelectedItem.Value));
                SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                CheckAssignedTypesForThemes();
                BindData();
            }
        }
        catch (Exception ex) { }
    }
}