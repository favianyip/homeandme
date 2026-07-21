using DevExpress.CodeParser;
using DevExpress.XtraBars.Docking2010.Views.Widget;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class CustomizeYourRoom : System.Web.UI.Page
{
    string ProjectID = String.Empty;
    string TotalRate = String.Empty;
    string TotalProjectCost = String.Empty;
    string SubSubOptionL3ID = String.Empty;
    public static int MethodType = 0;
    public static string ItemDataType = string.Empty;
    public static bool IsHaveLength = false;
    public static bool IsHaveWidth = false;
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Convert.ToString(Session["ProjectID"]) == "" || Convert.ToString(Session["ProjectID"]) == null)
        {
            Session.Remove("WHScopeID");
            Session.Remove("WHOptionID");
            Session.Remove("ScopeID");
            Session.Remove("OptionID");
            Session.Remove("SubOptionID");
            Session.Remove("SubSubOptionID");
            Session.Remove("SubSubOptionL2ID");
            Session.Remove("SubSubOptionL3ID");

            Response.Redirect("/Home.aspx");
        }
        else
        {
            if (!IsPostBack)
            {
                GetRoooms();
                GetTotalRoomCost();
                lblTotalAmount.Text = TotalRate.ToString();
            }
            getProjectCost();
            LoadScopeSavedData();
            if (Session["EditRoomID"] != null)
            {
                Session["RoomID"] = Session["EditRoomID"].ToString();
                Session["RoomPreferenceID"] = Session["EditRoomPreferenceID"].ToString();
                Session["EditRoomID"] = null;
                Session["EditRoomPreferenceID"] = null;
                GetRoooms();
                GetTotalRoomCost();
                if (!CheckWholeApartmentOrNot(Session["RoomID"].ToString()))
                {
                    divNotWholeApartment.Visible = true;
                    divForWholeApartment.Visible = false;
                    Initialize();
                }
                else
                {
                    divNotWholeApartment.Visible = false;
                    divForWholeApartment.Visible = true;
                    loadWHScopes();
                }
            }
        }
    }

    public static bool CheckWholeApartmentOrNot(string RoomID)
    {
        Boolean value = false;
        try
        {
            string ErrorIfAny = "";
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM Rooms WHERE RoomID = @RoomID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("RoomID", RoomID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                int IsWholeApartment = Convert.ToInt32(DS.Tables[0].Rows[0]["IsWholeApartment"]);
                if (IsWholeApartment == 1)
                {
                    value = true;
                }
            }
        }
        catch (Exception eX) { }
        return value;
    }

    public void ClearSessionNControls()
    {
        Session["ScopeID"] = null;
        Session["OptionID"] = null;
        Session["SubOptionID"] = null;
        Session["SubSubOptionID"] = null;
        Session["SubSubOptionL2ID"] = null;
        Session["SubSubOptionL3ID"] = null;
        Session["WHScopeID"] = null;
        Session["WHOptionID"] = null;
    }

    public void Initialize()
    {
        try
        {
            string RoomID = Session["RoomID"].ToString();
            string ProjectID = Session["ProjectID"].ToString();
            string ErrorIfAny = "";
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetRoomThemesForProject @RoomID, @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("RoomID", RoomID));
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = @"SELECT Scopes_in_ProjectRooms.ThemeID FROM Scopes_in_ProjectRooms 
                                        INNER JOIN RoomPreference ON RoomPreference.RoomPreferenceID = Scopes_in_ProjectRooms.RoomPreferenceID
                                        WHERE Scopes_in_ProjectRooms.RoomPreferenceID = " + Session["RoomPreferenceID"].ToString() + " AND RoomPreference.RoomID = " + Session["RoomID"].ToString();
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                if (DS.Tables[0].Rows.Count > 0)
                {
                    divRoomThemes.Visible = true;
                    rptRoomThemes.DataSource = DS;
                    rptRoomThemes.DataBind();
                    if (DS.Tables[1].Rows.Count > 0)
                    {
                        Session["ThemeID"] = Convert.ToString(DS.Tables[1].Rows[0]["ThemeID"]);
                        LoadScopes();
                        CheckRenovation();
                    }
                }
                else
                {
                    divRoomThemes.Visible = false;
                }
            }
        }
        catch (Exception ex) { }
    }

    public void CheckRenovation()
    {
        try
        {
            string ErrorIfAny = string.Empty;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = @"SELECT Scopes_in_ProjectRooms.ScopeID,Scopes_in_ProjectRooms.OptionID,Scopes_in_ProjectRooms.SubOptionID,Scopes_in_ProjectRooms.SubSubOptionID, 
                                    Scopes_in_ProjectRooms.SubSubOptionL2ID, Scopes_in_ProjectRooms.SubSubOptionL3ID FROM Scopes_in_ProjectRooms                               
                                    INNER JOIN Scopes ON Scopes.ScopeID=Scopes_in_ProjectRooms.ScopeID 
                                    INNER JOIN Options ON Options.OptionID=Scopes_in_ProjectRooms.OptionID 
                                    WHERE RoomPreferenceID=@RoomPreferenceID AND Scopes.ScopeID=@ScopeID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("RoomPreferenceID", Session["RoomPreferenceID"].ToString()));
            SqlParameters.Add(new SqlParameter("ScopeID", Session["ScopeID"].ToString()));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);

            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                if (DS.Tables[0].Rows.Count > 0)
                {
                    Session["OptionID"] = DS.Tables[0].Rows[0]["OptionID"].ToString();
                    Session["SubOptionID"] = DS.Tables[0].Rows[0]["SubOptionID"].ToString();
                    Session["SubSubOptionID"] = DS.Tables[0].Rows[0]["SubSubOptionID"].ToString();
                    Session["SubSubOptionL2ID"] = DS.Tables[0].Rows[0]["SubSubOptionL2ID"].ToString();
                    Session["SubSubOptionL3ID"] = DS.Tables[0].Rows[0]["SubSubOptionL3ID"].ToString();
                    LoadOptions();
                    LoadSubOptions();
                    LoadSubSubOptions();
                    LoadSubsubOptionL2();
                    LoadSubsubOptionL3();
                    ActiveSelection();
                }
                else
                {
                    LoadOptions();
                    LoadSubOptions();
                    LoadSubSubOptions();
                    LoadSubsubOptionL2();
                    LoadSubsubOptionL3();
                    ActiveSelection();
                }
            }
        }
        catch (Exception eX) { }
    }

    void GetRoooms()
    {
        try
        {
            if (Session["ProjectID"] != null && Session["ProjectID"] != "")
            {
                ProjectID = Session["ProjectID"].ToString();
                string ErrorIfAny = "";
                DataSet DS = new DataSet();
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "GetRoomPreferences @ProjectID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                {
                    throw new Exception(ErrorIfAny);
                }
                else
                {
                    rptRoomPreferences.DataSource = DS;
                    rptRoomPreferences.DataBind();
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void lnkDeleteRoom_Click(object sender, EventArgs e)
    {
        try
        {
            string RoomPreferenceID = ((LinkButton)sender).CommandArgument;
            string ErrorIfAny = "";
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "RemoveProjectRooms @RoomPreferenceID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("RoomPreferenceID", RoomPreferenceID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                GetRoooms();
                GetTotalRoomCost();
            }
        }
        catch (Exception ex) { }
    }

    void GetTotalRoomCost()
    {
        try
        {
            TotalRate = "0";
            if (Session["ProjectID"] != null && Session["ProjectID"] != "")
            {
                ProjectID = Session["ProjectID"].ToString();
                DataSet DS = new DataSet();
                string ErrorIfAny = "";
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "GetTotalRoomCost @ProjectID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                {
                    throw new Exception(ErrorIfAny);
                }
                else
                {
                    if (Convert.ToString(DS.Tables[0].Rows[0]["TotalRate"]) == "0" || Convert.ToString(DS.Tables[0].Rows[0]["TotalRate"]) == "")
                    {
                        TotalRate = "0";
                    }
                    else
                    {
                        TotalRate = DS.Tables[0].Rows[0]["TotalRate"].ToString();
                    }
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void lnkAddRoom_Click(object sender, EventArgs e)
    {
        try
        {
            if (Session["ProjectID"] != null && Session["ProjectID"] != "")
            {
                ProjectID = Session["ProjectID"].ToString();
                string ErrorIfAny = "";
                if (drpRoomType.SelectedValue != "-1")
                {
                    DataSet DS = new DataSet();
                    List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "AddRoomForProject @ProjectID, @RoomID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                        SqlParameters.Add(new SqlParameter("RoomID", drpRoomType.SelectedValue));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                    if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                    {
                        throw new Exception(ErrorIfAny);
                    }
                    else
                    {
                        GetRoooms();
                        GetTotalRoomCost();
                    }
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void lnkActiveRoom_Click(object sender, EventArgs e)
    {
        try
        {
            string RoomPreferenceID = ((LinkButton)sender).CommandArgument;
            string RoomID = ((LinkButton)sender).CommandName;
            string RoomName = String.Empty;

            string Error = "";
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainers = new Tools.SqlContainer();
                SQLContainers.Query = "SELECT * FROM Rooms WHERE RoomID = @RoomID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("RoomID", RoomID));
                SQLContainers.SqlParameters = SqlParameters;
                SQLCommand.Add(SQLContainers);
            }
            if (!Tools.GetData(SQLCommand, out ds, out Error)) { }
            else
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    if (Convert.ToString(ds.Tables[0].Rows[0]["IsWholeApartment"]) == "1")
                    {
                        Session["WHScopeID"] = null;
                        Session["WHOptionID"] = null;
                        divNotWholeApartment.Visible = false;
                        divForWholeApartment.Visible = true;
                        RoomName = ds.Tables[0].Rows[0]["RoomName"].ToString();
                        Session["RoomPreferenceID"] = RoomPreferenceID.ToString();
                        Session["RoomID"] = Convert.ToString(RoomID.ToString());
                        GetRoooms();
                        GetTotalRoomCost();
                        loadWHScopes();
                    }
                    else
                    {
                        divNotWholeApartment.Visible = true;
                        divForWholeApartment.Visible = false;

                        Session["SubOptionID"] = null;
                        Session["EditRenovationID"] = null;
                        Session["ScopeID"] = null;
                        Session["EditScopeID"] = null;
                        Session["EditRoomID"] = null;
                        Session["OptionID"] = null;
                        Session["SubSubOptionID"] = null;
                        Session["SubSubOptionL2ID"] = null;
                        Session["SubSubOptionL3ID"] = null;
                        Session["RoomPreferenceID"] = RoomPreferenceID.ToString();
                        divRoomThemes.Visible = false;
                        divScopeItems.Visible = false;
                        divOptionItems.Visible = false;
                        lblRoomTotalCost.Text = "";
                        lblWHRoomTotalCost.Text = "";
                        if (Session["ProjectID"] != null && Session["ProjectID"] != "")
                        {
                            ProjectID = Session["ProjectID"].ToString();
                            string ErrorIfAny = "";
                            DataSet DS = new DataSet();
                            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                            {
                                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                                SQLContainer.Query = "SELECT RoomName FROM RoomPreference WHERE RoomPreferenceID = @RoomPreferenceID";
                                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                                SqlParameters.Add(new SqlParameter("RoomPreferenceID", RoomPreferenceID));
                                SQLContainer.SqlParameters = SqlParameters;
                                SQLCommands.Add(SQLContainer);
                            }
                            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                            {
                                throw new Exception(ErrorIfAny);
                            }
                            else
                            {
                                RoomName = DS.Tables[0].Rows[0]["RoomName"].ToString();
                                Session["RoomID"] = Convert.ToString(RoomID.ToString());
                                GetRoooms();
                                GetTotalRoomCost();
                                Initialize();
                            }
                        }
                    }
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void chkTheme_CheckedChanged(object sender, EventArgs e)
    {
        try
        {
            var chk = (CheckBox)sender;
            string ThemeID = Convert.ToString(chk.Attributes["CommandName"]);
            Session["ThemeID"] = ThemeID.ToString();
            rptRoomThemes.DataBind();
        }
        catch (Exception eX) { }
    }

    protected void LoadScopes()
    {
        try
        {
            string ErrorIfAny = String.Empty;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetScopesByThemeID @ThemeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ThemeID", Session["ThemeID"].ToString()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = @"SELECT * FROM Scopes_in_ProjectRooms INNER JOIN RoomPreference ON RoomPreference.RoomPreferenceID = Scopes_in_ProjectRooms.RoomPreferenceID 
                                        WHERE RoomPreference.RoomPreferenceID = " + Session["RoomPreferenceID"].ToString() + " AND ThemeID = " + Session["ThemeID"].ToString() + " AND RoomPreference.IsActive = 1 AND Scopes_in_ProjectRooms.IsActive = 1";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SQLCommands.Add(SQLContainer);
            }
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = @"SELECT 
                                        	TOP 1 ThemeConfiguration.ScopeID,ThemeConfiguration.OptionID,View_Items.SubOptionID,View_Items.SubsubOptionID,
                                        	View_Items.SubsubOptionL2ID,View_Items.SubsubOptionL3ID,ThemeConfiguration.IsDefault 
                                        FROM ThemeConfiguration
                                        INNER JOIN View_Items ON ThemeConfiguration.SubsubOptionL3ID = View_Items.SubsubOptionL3ID
                                        WHERE ThemeConfiguration.IsDefault = 1 AND ThemeID = " + Session["ThemeID"].ToString();
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SQLCommands.Add(SQLContainer);
            }
            if (Convert.ToString(Session["ThemeID"]) == "-1")
            {
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = @"SELECT ScopeID, Scope, View_Items.ScopeImage AS ImageUrl FROM View_Items
                                             WHERE OptionActive=1 AND SystemAddOn=0 AND (OptionHidden = 0)
                                             GROUP BY ScopeID,Scope,View_Items.ScopeImage";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SQLCommands.Add(SQLContainer);
                }
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                if (DS.Tables[0].Rows.Count > 0)
                {
                    if (DS.Tables[1].Rows.Count > 0)
                    {
                        Session["ScopeID"] = Convert.ToString(DS.Tables[1].Rows[0]["ScopeID"]);
                        Session["OptionID"] = Convert.ToString(DS.Tables[1].Rows[0]["OptionID"]);
                        Session["SubOptionID"] = Convert.ToString(DS.Tables[1].Rows[0]["SubOptionID"]);
                        Session["SubSubOptionID"] = Convert.ToString(DS.Tables[1].Rows[0]["SubsubOptionID"]);
                        Session["SubSubOptionL2ID"] = Convert.ToString(DS.Tables[1].Rows[0]["SubsubOptionL2ID"]);
                        Session["SubSubOptionL3ID"] = Convert.ToString(DS.Tables[1].Rows[0]["SubsubOptionL3ID"]);
                        SetScopeName(Convert.ToString(Session["ScopeID"]));
                        LoadAddOns();
                        LoadOptions();
                        LoadSubOptions();
                        LoadSubSubOptions();
                        LoadSubsubOptionL2();
                        LoadSubsubOptionL3();
                        LoadItemMeasurements();
                        LoadScopeSavedData();
                        ActiveSelection();
                    }
                    else
                    {
                        if (DS.Tables[2].Rows.Count > 0)
                        {
                            Session["ScopeID"] = Convert.ToString(DS.Tables[2].Rows[0]["ScopeID"]);
                            Session["OptionID"] = Convert.ToString(DS.Tables[2].Rows[0]["OptionID"]);
                            Session["SubOptionID"] = Convert.ToString(DS.Tables[2].Rows[0]["SubOptionID"]);
                            Session["SubSubOptionID"] = Convert.ToString(DS.Tables[2].Rows[0]["SubsubOptionID"]);
                            Session["SubSubOptionL2ID"] = Convert.ToString(DS.Tables[2].Rows[0]["SubsubOptionL2ID"]);
                            Session["SubSubOptionL3ID"] = Convert.ToString(DS.Tables[2].Rows[0]["SubsubOptionL3ID"]);
                            SetScopeName(Convert.ToString(Session["ScopeID"]));
                            LoadAddOns();
                            LoadOptions();
                            LoadSubOptions();
                            LoadSubSubOptions();
                            LoadSubsubOptionL2();
                            LoadSubsubOptionL3();
                            LoadItemMeasurements();
                            LoadScopeSavedData();
                            ActiveSelection();
                        }
                        else
                        {
                            Session["ScopeID"] = "0";
                            ActiveSelection();
                        }
                    }
                    divScopeItems.Visible = true;
                    rptRoomScopes.DataSource = DS.Tables[0];
                    rptRoomScopes.DataBind();
                }
                else
                {
                    if (DS.Tables[3].Rows.Count > 0)
                    {
                        divScopeItems.Visible = true;
                        rptRoomScopes.DataSource = DS.Tables[3];
                        rptRoomScopes.DataBind();
                    }
                    else
                    {
                        divScopeItems.Visible = false;
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    public void SetScopeName(String ScopeID)
    {
        String ErrorIfAny = String.Empty;
        DataSet DS = new DataSet();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
        SQLContainer.Query = "SELECT * FROM Scopes WHERE ScopeID=" + ScopeID;
        List<SqlParameter> SqlParameters = new List<SqlParameter>();
        SQLCommands.Add(SQLContainer);

        if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
        {
            throw new Exception(ErrorIfAny);
        }
        else
        {
            lblSCScopeText.Text = DS.Tables[0].Rows[0]["Scope"].ToString();
            lblSCScopeText2.Text = DS.Tables[0].Rows[0]["Scope"].ToString();
        }
    }

    public void restScopes()
    {
        string ErrorIfAny = String.Empty;
        DataSet DS = new DataSet();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "GetScopesByThemeID @ThemeID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ThemeID", Session["ThemeID"].ToString()));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = @"SELECT * FROM Scopes";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SQLCommands.Add(SQLContainer);
        }
        if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
        {
            throw new Exception(ErrorIfAny);
        }
        else
        {
            if (DS.Tables[0].Rows.Count > 0)
            {
                rptRoomScopes.DataSource = DS.Tables[0];
                rptRoomScopes.DataBind();
            }
            else
            {
                rptRoomScopes.DataSource = DS.Tables[1];
                rptRoomScopes.DataBind();
            }
        }
    }

    protected void ibScope_Click(object sender, ImageClickEventArgs e)
    {
        Session["ScopeID"] = ((ImageButton)sender).CommandArgument;
        string gg = Session["ScopeID"].ToString();
        restScopes();
        SetScopeName(Convert.ToString(Session["ScopeID"]));
        LoadAddOns();
        LoadOptions();
        Session["OptionID"] = null;
        Session["SubOptionID"] = null;
        Session["SubSubOptionID"] = null;
        Session["SubSubOptionL2ID"] = null;
        Session["SubSubOptionL3ID"] = null;
        divSubOptionItems.Visible = false;
        divSubSubOptionItems.Visible = false;
        divSubSubOptionL2Items.Visible = false;
        divSubSubOptionL3Items.Visible = false;
        divL3Details.Visible = false;
        divDataCollection.Visible = false;
        LoadScopeSavedData();
        CheckRenovation();
        ActiveSelection();
    }

    public void LoadScopeSavedData()
    {
        try
        {
            string error = string.Empty;
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectScopeDetails @ReferenceID, @ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ReferenceID", Session["RoomPreferenceID"] == null ? "" : Session["RoomPreferenceID"].ToString()));
                SqlParameters.Add(new SqlParameter("ScopeID", Session["ScopeID"] == null ? "" : Session["ScopeID"].ToString()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommand.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommand, out ds, out error))
            {
                throw new Exception(error);
            }
            else
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    divScopeDeatilList.Visible = true;
                    GridRoomOptions.DataSource = ds.Tables[0];
                    GridRoomOptions.DataBind();
                }
                else
                {
                    divScopeDeatilList.Visible = false;
                }
            }
        }
        catch (Exception eX) { }
    }

    public void LoadAddOns()
    {
        string ErrorIfAny = string.Empty;
        DataSet DS = new DataSet();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT * FROM Options WHERE ScopeID=" + Session["ScopeID"].ToString() + "AND IsHidden = 0 AND SystemAddOn = 1";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SQLCommands.Add(SQLContainer);
        }
        if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
        {
            throw new Exception(ErrorIfAny);
        }
        else
        {
            divOptionAddsOn.Visible = false;
            divOptionAddsOnHead.Visible = false;
            if (DS.Tables[0].Rows.Count > 0)
            {
                rptAddOns.DataSource = DS;
                rptAddOns.DataBind();
            }
        }
    }

    public void LoadOptions()
    {
        string ErrorIfAny = string.Empty;
        DataSet DS = new DataSet();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();


        if (Convert.ToString(Session["ThemeID"]) == "-1")
        {
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = @"SELECT DISTINCT OptionID,[Option],OptionImage AS ImageUrl FROM View_Items WHERE ScopeID = " + Session["ScopeID"].ToString() + " AND OptionActive=1  AND OptionHidden=0";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SQLCommands.Add(SQLContainer);
            }
        }
        else
        {
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = @"SELECT  
 	                                        DISTINCT ThemeConfiguration.OptionID,View_Items.[Option],View_Items.OptionImage AS ImageUrl
                                        FROM ThemeConfiguration
                                        INNER JOIN View_Items ON ThemeConfiguration.SubsubOptionL3ID = View_Items.SubsubOptionL3ID
                                        INNER JOIN SubOptions ON SubOptions.OptionID = ThemeConfiguration.OptionID 
                                        INNER JOIN SubsubOptions ON SubsubOptions.SubOptionID = SubOptions.SubOptionID
                                        INNER JOIN SubsubOptionL2 ON SubsubOptionL2.SubsubOptionID = SubsubOptions.SubsubOptionID
                                        INNER JOIN SubsubOptionL3 ON SubsubOptionL3.SubsubOptionL2ID = SubsubOptionL2.SubsubOptionL2ID
                                        INNER JOIN RoomConfigurations ON RoomConfigurations.SubsubOptionL3ID = SubsubOptionL3.SubsubOptionL3ID
                                        WHERE ThemeConfiguration.ThemeID =  " + Session["ThemeID"].ToString() + " AND RoomConfigurations.RoomID = " + Session["RoomID"] + " AND RoomConfigurations.ScopeID =" + Session["ScopeID"].ToString();
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SQLCommands.Add(SQLContainer);
            }
        }
        if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
        {
            throw new Exception(ErrorIfAny);
        }
        else
        {
            if (DS.Tables[0].Rows.Count > 0)
            {
                Session["ActiveOption"] = "1";
                Session["OptionID"] = Convert.ToString(DS.Tables[0].Rows[0]["OptionID"]);
                divOptionItems.Visible = true;
                rptOptions.DataSource = DS;
                rptOptions.DataBind();
                ProjectResaleAndWetWork();
            }
            else
            {
                Session["ActiveOption"] = "0";
                string Error = string.Empty;
                DataSet ds = new DataSet();
                List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = @"SELECT DISTINCT OptionID,[Option],OptionImage AS ImageUrl FROM View_Items WHERE ScopeID = " + Session["ScopeID"].ToString() + " AND OptionActive=1  AND OptionHidden=0";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SQLCommand.Add(SQLContainer);
                }
                if (!Tools.GetData(SQLCommand, out DS, out ErrorIfAny))
                {
                    throw new Exception(ErrorIfAny);
                }
                else
                {
                }
                LoadItemMeasurements();
            }
        }
    }

    public void ProjectResaleAndWetWork()
    {
        try
        {
            string ErrorIfAny = "";
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "CheckProjectResaleAndWetWork @ProjectID, @ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", Session["ProjectID"]));
                SqlParameters.Add(new SqlParameter("ScopeID", Session["ScopeID"]));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                if (Convert.ToString(DS.Tables[0].Rows[0]["IsWetWorkAndResale"]) == "1")
                {
                    divSealerCostCondition.Visible = true;
                }
                else
                {
                    divSealerCostCondition.Visible = false;
                }
            }
        }
        catch (Exception eX) { }
    }

    public void LoadSubOptions()
    {
        try
        {
            if (Session["OptionID"] != null)
            {
                String ErrorIfAny = string.Empty;
                DataSet DS = new DataSet();
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                if (Convert.ToString(Session["ThemeID"]) != "-1")
                {
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = @"SELECT  
 	                                        DISTINCT View_Items.SubOption,View_Items.SubOptionID,View_Items.SubOptionImage AS ImageUrl
                                        FROM ThemeConfiguration
                                        INNER JOIN SubOptions ON SubOptions.OptionID = ThemeConfiguration.OptionID 
                                        INNER JOIN SubsubOptions ON SubsubOptions.SubOptionID = SubOptions.SubOptionID
                                        INNER JOIN SubsubOptionL2 ON SubsubOptionL2.SubsubOptionID = SubsubOptions.SubsubOptionID
                                        INNER JOIN SubsubOptionL3 ON SubsubOptionL3.SubsubOptionL2ID = SubsubOptionL2.SubsubOptionL2ID
                                        INNER JOIN RoomConfigurations ON RoomConfigurations.SubsubOptionL3ID = SubsubOptionL3.SubsubOptionL3ID
                                        INNER JOIN View_Items ON ThemeConfiguration.SubsubOptionL3ID = View_Items.SubsubOptionL3ID
                                        WHERE ThemeConfiguration.ThemeID =  " + Session["ThemeID"].ToString() + " AND RoomConfigurations.RoomID = " + Session["RoomID"] +
                                        " AND RoomConfigurations.ScopeID =" + Session["ScopeID"].ToString() + " AND View_Items.OptionID = " + Session["OptionID"].ToString() + " AND View_Items.SubOptionActive=1 AND View_Items.SubOptionHidden=0";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                }
                else
                {
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT DISTINCT SubOption,SubOptionID,SubOptionImage AS ImageUrl FROM View_Items WHERE OptionID = " + Session["OptionID"].ToString() + " AND SubOptionActive=1 AND SubOptionHidden=0";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT [Option] FROM Options WHERE OptionID = " + Session["OptionID"].ToString();
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                }
                if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                {
                    throw new Exception(ErrorIfAny);
                }
                else
                {
                    if (DS.Tables[0].Rows.Count > 0)
                    {
                        divSubOptionItems.Visible = true;
                        Session["ActiveSubOption"] = 1;
                        divSubOptionItems.Visible = true;
                        rptSubOptions.DataSource = DS;
                        rptSubOptions.DataBind();
                        divSubSubOptionItems.Visible = false;
                        divSubSubOptionL2Items.Visible = false;
                        divSubSubOptionL3Items.Visible = false;
                    }
                    else
                    {
                        Session["SubOptionID"] = null;
                        Session["ActiveSubOption"] = 0;
                        divSubOptionItems.Visible = false;
                        divSubSubOptionItems.Visible = false;
                        divSubSubOptionL2Items.Visible = false;
                        divSubSubOptionL3Items.Visible = false;
                        divL3Details.Visible = false;
                        divDataCollection.Visible = false;
                        LoadItemMeasurements();
                    }
                }
            }
            else
            {
            }
        }
        catch (Exception eX) { }
    }

    public void LoadSubSubOptions()
    {
        try
        {
            if (Session["SubOptionID"] != null)
            {
                String ErrorIfAny = string.Empty;
                DataSet DS = new DataSet();
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                if (Convert.ToString(Session["ThemeID"]) != "-1")
                {
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = @"SELECT  
 	                                        DISTINCT View_Items.SubSubOption,View_Items.SubSubOptionID,View_Items.SubSubOptionImage AS ImageUrl
                                        FROM ThemeConfiguration
                                        INNER JOIN SubOptions ON SubOptions.OptionID = ThemeConfiguration.OptionID 
                                        INNER JOIN SubsubOptions ON SubsubOptions.SubOptionID = SubOptions.SubOptionID
                                        INNER JOIN SubsubOptionL2 ON SubsubOptionL2.SubsubOptionID = SubsubOptions.SubsubOptionID
                                        INNER JOIN SubsubOptionL3 ON SubsubOptionL3.SubsubOptionL2ID = SubsubOptionL2.SubsubOptionL2ID
                                        INNER JOIN RoomConfigurations ON RoomConfigurations.SubsubOptionL3ID = SubsubOptionL3.SubsubOptionL3ID
                                        INNER JOIN View_Items ON ThemeConfiguration.SubsubOptionL3ID = View_Items.SubsubOptionL3ID
                                        WHERE ThemeConfiguration.ThemeID =  " + Session["ThemeID"].ToString() + " AND RoomConfigurations.RoomID = " + Session["RoomID"] +
                                        " AND RoomConfigurations.ScopeID = " + Session["ScopeID"].ToString() + " AND View_Items.OptionID = " + Session["OptionID"].ToString() +
                                        " AND View_Items.SubOptionId = " + Session["SubOptionID"].ToString() + " AND View_Items.SubsubOptionHidden=0 ";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT SubOption FROM SubOptions WHERE SubOptionID = " + Session["SubOptionID"].ToString();
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                }
                else
                {
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT  DISTINCT SubSubOption,SubSubOptionID,SubSubOptionImage AS ImageUrl FROM View_Items WHERE SubOptionID = " + Session["SubOptionID"].ToString() + " AND SubSubOptionhidden=0";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT SubOption FROM SubOptions WHERE SubOptionID = " + Session["SubOptionID"].ToString();
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                }
                if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                {
                    throw new Exception(ErrorIfAny);
                }
                else
                {
                    if (DS.Tables[0].Rows.Count > 0)
                    {
                        lblSubOptionName.Text = DS.Tables[1].Rows[0]["SubOption"].ToString();
                        divSubSubOptionItems.Visible = true;
                        Session["ActiveSubSubOption"] = "1";
                        rptSubSubOption.DataSource = DS;
                        rptSubSubOption.DataBind();
                    }
                    else
                    {
                        Session["ActiveSubSubOption"] = "0";
                        Session["SubSubOptionID"] = null;
                        divSubSubOptionItems.Visible = false;
                        LoadItemMeasurements();
                    }
                }
            }
            else
            {
                Session["ActiveSubSubOption"] = "0";
                Session["SubSubOptionID"] = null;
                divSubSubOptionItems.Visible = false;
            }
        }
        catch (Exception eX) { }
    }

    public void LoadSubsubOptionL2()
    {
        try
        {
            if (Session["SubsubOptionID"] != null)
            {
                String ErrorIfAny = string.Empty;
                DataSet DS = new DataSet();
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                if (Convert.ToString(Session["ThemeID"]) != "-1")
                {
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = @"SELECT  
 	                                        DISTINCT View_Items.SubSubOptionL2,View_Items.SubsubOptionL2ID,View_Items.SubsubOptionL2Image AS ImageUrl
                                        FROM ThemeConfiguration
                                        INNER JOIN SubOptions ON SubOptions.OptionID = ThemeConfiguration.OptionID 
                                        INNER JOIN SubsubOptions ON SubsubOptions.SubOptionID = SubOptions.SubOptionID
                                        INNER JOIN SubsubOptionL2 ON SubsubOptionL2.SubsubOptionID = SubsubOptions.SubsubOptionID
                                        INNER JOIN SubsubOptionL3 ON SubsubOptionL3.SubsubOptionL2ID = SubsubOptionL2.SubsubOptionL2ID
                                        INNER JOIN RoomConfigurations ON RoomConfigurations.SubsubOptionL3ID = SubsubOptionL3.SubsubOptionL3ID
                                        INNER JOIN View_Items ON ThemeConfiguration.SubsubOptionL3ID = View_Items.SubsubOptionL3ID
                                        WHERE ThemeConfiguration.ThemeID =  " + Session["ThemeID"].ToString() + " AND RoomConfigurations.RoomID = " + Session["RoomID"] +
                                        " AND RoomConfigurations.ScopeID = " + Session["ScopeID"].ToString() + " AND View_Items.OptionID = " + Session["OptionID"].ToString() +
                                        " AND View_Items.SubsubOptionId = " + Session["SubsubOptionID"].ToString() + " AND View_Items.SubsubOptionL2Hidden=0  AND View_Items.SubsubOptionL2Active =1";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT SubsubOption FROM SubsubOptions WHERE SubsubOptionID = " + Session["SubsubOptionID"].ToString();
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                }
                else
                {
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT DISTINCT SubSubOptionL2,SubSubOptionL2ID,SubSubOptionL2Image AS ImageUrl FROM View_Items WHERE SubsubOptionID = " + Session["SubsubOptionID"].ToString() + " AND SubSubOptionL2Hidden=0";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT SubsubOption FROM SubsubOptions WHERE SubsubOptionID = " + Session["SubsubOptionID"].ToString();
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                }
                if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                {
                    throw new Exception(ErrorIfAny);
                }
                else
                {
                    if (DS.Tables[0].Rows.Count > 0)
                    {
                        lblSSubOptionText.Text = DS.Tables[1].Rows[0]["SubsubOption"].ToString();
                        divSubSubOptionL2Items.Visible = true;
                        Session["ActiveSubSubOptionL2"] = "1";
                        rptSubSubOptionL2.DataSource = DS;
                        rptSubSubOptionL2.DataBind();
                    }
                    else
                    {
                        Session["ActiveSubSubOptionL2"] = "0";
                        Session["SubSubOptionL2ID"] = null;
                        divSubSubOptionL2Items.Visible = false;
                        LoadItemMeasurements();
                    }
                }
            }
            else
            {
                Session["ActiveSubSubOptionL2"] = "0";
                Session["SubSubOptionL2ID"] = null;
                divSubSubOptionL2Items.Visible = false;
            }
        }
        catch { }
    }

    public void LoadSubsubOptionL3()
    {
        try
        {
            if (Session["SubsubOptionL2ID"] != null)
            {
                String ErrorIfAny = string.Empty;
                DataSet DS = new DataSet();
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                if (Convert.ToString(Session["ThemeID"]) != "-1")
                {
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = @"SELECT  
 	                                        DISTINCT View_Items.SubSubOptionL3,View_Items.SubsubOptionL3ID,View_Items.SubsubOptionL3Image AS ImageUrl
                                        FROM ThemeConfiguration
                                        INNER JOIN SubOptions ON SubOptions.OptionID = ThemeConfiguration.OptionID 
                                        INNER JOIN SubsubOptions ON SubsubOptions.SubOptionID = SubOptions.SubOptionID
                                        INNER JOIN SubsubOptionL2 ON SubsubOptionL2.SubsubOptionID = SubsubOptions.SubsubOptionID
                                        INNER JOIN SubsubOptionL3 ON SubsubOptionL3.SubsubOptionL2ID = SubsubOptionL2.SubsubOptionL2ID
                                        INNER JOIN RoomConfigurations ON RoomConfigurations.SubsubOptionL3ID = SubsubOptionL3.SubsubOptionL3ID
                                        INNER JOIN View_Items ON ThemeConfiguration.SubsubOptionL3ID = View_Items.SubsubOptionL3ID
                                        WHERE ThemeConfiguration.ThemeID =  " + Session["ThemeID"].ToString() + " AND RoomConfigurations.RoomID = " + Session["RoomID"] +
                                        " AND RoomConfigurations.ScopeID = " + Session["ScopeID"].ToString() + " AND View_Items.OptionID = " + Session["OptionID"].ToString() +
                                        " AND View_Items.SubsubOptionL2Id = " + Session["SubsubOptionL2ID"].ToString() + " AND View_Items.SubsubOptionL3Hidden=0 ";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT SubsubOptionL2 FROM SubsubOptionL2 WHERE SubsubOptionL2ID = " + Session["SubsubOptionL2ID"].ToString();
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                }
                else
                {
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT DISTINCT SubSubOptionL3,SubSubOptionL3ID,SubSubOptionL3Image AS ImageUrl FROM View_Items WHERE SubsubOptionL2ID = " + Session["SubsubOptionL2ID"].ToString() + " AND SubSubOptionL3Hidden=0";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT SubsubOptionL2 FROM SubsubOptionL2 WHERE SubsubOptionL2ID = " + Session["SubsubOptionL2ID"].ToString();
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SQLCommands.Add(SQLContainer);
                    }
                }
                if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                {
                    throw new Exception(ErrorIfAny);
                }
                else
                {
                    if (DS.Tables[0].Rows.Count > 0)
                    {
                        if (DS.Tables[1].Rows.Count > 0)
                        {
                            lblSSubOptionl2Text.Text = DS.Tables[1].Rows[0]["SubsubOptionL2"].ToString();
                            LoadItemMeasurements();
                        }
                        divSubSubOptionL3Items.Visible = true;
                        Session["ActiveSubSubOptionL3"] = "1";
                        rptSubSubOptionL3.DataSource = DS;
                        rptSubSubOptionL3.DataBind();
                    }
                    else
                    {
                        Session["ActiveSubSubOptionL3"] = "0";
                        Session["SubSubOptionL3ID"] = null;
                        divSubSubOptionL3Items.Visible = false;
                        LoadItemMeasurements();
                    }
                }
            }
            else
            {
                Session["ActiveSubSubOptionL3"] = "0";
                Session["SubSubOptionL3ID"] = null;
                divSubSubOptionL3Items.Visible = false;
            }
        }
        catch { }
    }

    public void LoadItemMeasurements()
    {
        try
        {
            string error = string.Empty;
            DataSet ds = new DataSet();
            double mmValue = 304.8;
            txtDCLength.Text = String.Empty;
            txtDCWidth.Text = String.Empty;
            txtDCHeight.Text = String.Empty;
            txtDCThickness.Text = String.Empty;
            txtDCQuantity.Text = String.Empty;
            txtLength.Text = String.Empty;
            txtWidth.Text = String.Empty;
            txtQuantity.Text = String.Empty;
            List <Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetItemMeasurementData @ScopeID,@OptionID,@SubOptionID,@SubSubOptionID,@SubSubOptionL2ID,@SubSubOptionL3ID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", Session["ScopeID"] == null ? "" : Session["ScopeID"].ToString()));
                SqlParameters.Add(new SqlParameter("OptionID", Session["OptionID"] == null ? "" : Session["OptionID"].ToString()));
                SqlParameters.Add(new SqlParameter("SubOptionID", Session["SubOptionID"] == null ? "" : Session["SubOptionID"].ToString()));
                SqlParameters.Add(new SqlParameter("SubSubOptionID", Session["SubSubOptionID"] == null ? "" : Session["SubSubOptionID"].ToString()));
                SqlParameters.Add(new SqlParameter("SubSubOptionL2ID", Session["SubSubOptionL2ID"] == null ? "" : Session["SubSubOptionL2ID"].ToString()));
                SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", Session["SubSubOptionL3ID"] == null ? "" : Session["SubSubOptionL3ID"].ToString()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommand.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommand, out ds, out error))
            {
                throw new Exception(error);
            }
            else
            {
                SubSubOptionL3ID = Convert.ToString(ds.Tables[0].Rows[0]["SubsubOptionL3ID"]);
                string ErrorIfAny = string.Empty;
                DataSet DS = new DataSet();
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = @"SELECT DISTINCT OptionID,[Option],Length,Width,Height,Numbers,UOM FROM View_Items WHERE SubsubOptionL3ID = " + Convert.ToString(ds.Tables[0].Rows[0]["SubsubOptionL3ID"]);
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SQLCommands.Add(SQLContainer);
                }
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = @"SELECT Length,Width,Height,Numbers FROM ThemeConfiguration WHERE ThemeID = " + Session["ThemeID"].ToString();
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SQLCommands.Add(SQLContainer);
                }
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = @"SELECT * FROM ServiceRate WHERE SubsubOptionL3ID = " + Convert.ToString(ds.Tables[0].Rows[0]["SubsubOptionL3ID"]);
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SQLCommands.Add(SQLContainer);
                }
                if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
                {
                    throw new Exception(ErrorIfAny);
                }
                else
                {
                    if (DS.Tables[0].Rows.Count > 0)
                    {
                        divL3Details.Visible = true;
                        LblAreaQty.Text = "What is the size?";
                        if (DS.Tables[0].Rows[0]["Numbers"].ToString() == "1")
                        {
                            LblAreaQty.Text = "Please select your preferred quantity";
                            DivArea.Visible = false;
                        }
                        else
                        {
                            DivArea.Visible = true;
                        }
                        DivLength.Visible = Convert.ToBoolean(Convert.ToInt32(DS.Tables[0].Rows[0]["Length"]));
                        DivWidth.Visible = Convert.ToBoolean(Convert.ToInt32(DS.Tables[0].Rows[0]["Width"]));
                        DivQuantity.Visible = Convert.ToBoolean(Convert.ToInt32(DS.Tables[0].Rows[0]["Numbers"]));
                        IsHaveLength = Convert.ToBoolean(Convert.ToInt32(DS.Tables[0].Rows[0]["Length"]));
                        IsHaveWidth = Convert.ToBoolean(Convert.ToInt32(DS.Tables[0].Rows[0]["Width"]));
                        if ((IsHaveLength == true && IsHaveWidth == false) || (IsHaveLength == false && IsHaveWidth == false))
                        {
                            DivArea.Visible = false;
                        }
                        if (DS.Tables[2].Rows.Count > 0)
                        {
                            divDataCollection.Visible = false;
                            divDCLength.Visible = Convert.ToBoolean(Convert.ToInt32(DS.Tables[2].Rows[0]["Length"]));
                            divDCWidth.Visible = Convert.ToBoolean(Convert.ToInt32(DS.Tables[2].Rows[0]["Width"]));
                            divDCQuantity.Visible = Convert.ToBoolean(Convert.ToInt32(DS.Tables[2].Rows[0]["Numbers"]));
                            DivDCHeight.Visible = Convert.ToBoolean(Convert.ToInt32(DS.Tables[2].Rows[0]["Height"]));
                            DivDCTickness.Visible = Convert.ToBoolean(Convert.ToInt32(DS.Tables[2].Rows[0]["Thickness"]));

                            txtDCLength.Text = Convert.ToString(DS.Tables[2].Rows[0]["DefaultLength"]);
                            txtDCWidth.Text = Convert.ToString(DS.Tables[2].Rows[0]["DefaultWidth"]);
                            txtDCHeight.Text = Convert.ToString(DS.Tables[2].Rows[0]["DefaultHeight"]);
                            txtDCThickness.Text = Convert.ToString(DS.Tables[2].Rows[0]["DefaultThickness"]);
                            txtDCQuantity.Text = Convert.ToString(DS.Tables[2].Rows[0]["DefaultQuantity"]);

                            //if (Convert.ToInt32(DS.Tables[2].Rows[0]["UOM"]) == 1)
                            //{
                            //    lblDCLengthmm.Text = Convert.ToString(Convert.ToInt32(DS.Tables[2].Rows[0]["DefaultLength"]) * mmValue);
                            //    lblDCWidthmm.Text = Convert.ToString(Convert.ToInt32(DS.Tables[2].Rows[0]["DefaultWidth"]) * mmValue);
                            //    lblDCHeightmm.Text = Convert.ToString(Convert.ToInt32(DS.Tables[2].Rows[0]["DefaultHeight"]) * mmValue);
                            //    lblDCThicknessmm.Text = Convert.ToString(Convert.ToInt32(DS.Tables[2].Rows[0]["DefaultThickness"]) * mmValue);
                            //}
                            if (Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextLength"]) == "" || Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextLength"]) == null)
                            {
                                lblDCLengthText.Text = "Length";
                                lblDCLengthText2.Text = "Length";
                            }
                            else
                            {
                                lblDCLengthText.Text = Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextLength"]);
                                lblDCLengthText2.Text = Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextLength"]);
                            }
                            if (Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextWidth"]) == "" || Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextWidth"]) == null)
                            {
                                lblDCWidthText.Text = "Width";
                                lblDCWidthText2.Text = "Width";
                            }
                            else
                            {
                                lblDCWidthText.Text = Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextWidth"]);
                                lblDCWidthText2.Text = Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextWidth"]);
                            }
                            if (Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextHeight"]) == "" || Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextHeight"]) == null)
                            {
                                lblDCHeightText.Text = "Height";
                                lblDCHeightText2.Text = "Height";
                            }
                            else
                            {
                                lblDCHeightText.Text = Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextHeight"]);
                                lblDCHeightText2.Text = Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextHeight"]);
                            }
                            if (Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextThickness"]) == "" || Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextThickness"]) == null)
                            {
                                lblDCTicknessText.Text = "Thickness";
                                lblDCTicknessText2.Text = "Thickness";
                            }
                            else
                            {
                                lblDCTicknessText.Text = Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextThickness"]);
                                lblDCTicknessText2.Text = Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextThickness"]);
                            }
                            if (Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextQuantity"]) == "" || Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextQuantity"]) == null)
                            {
                                lblDCQuantityText.Text = "Quantity";
                            }
                            else
                            {
                                lblDCQuantityText.Text = Convert.ToString(DS.Tables[2].Rows[0]["DisplayTextQuantity"]);
                            }
                        }
                        else
                        {
                            divDataCollection.Visible = false;
                        }
                        if (DS.Tables[1].Rows.Count > 0)
                        {
                            txtLength.Text = Convert.ToString(DS.Tables[1].Rows[0]["Length"]);
                            txtWidth.Text = Convert.ToString(DS.Tables[1].Rows[0]["Width"]);
                            lblLengthft.Text = Convert.ToString(Convert.ToDouble(DS.Tables[1].Rows[0]["Length"]) / 304.8);
                            lblWidthft.Text = Convert.ToString(Convert.ToDouble(DS.Tables[1].Rows[0]["Width"]) / 304.8);
                            lblAreaft.Text = Convert.ToString((Convert.ToDouble(DS.Tables[1].Rows[0]["Length"]) * Convert.ToDouble(304.8)) * (Convert.ToDouble(DS.Tables[1].Rows[0]["Width"]) * Convert.ToDouble(304.8)));
                            txtArea.Text = Convert.ToString(Convert.ToInt32(DS.Tables[1].Rows[0]["Length"]) * Convert.ToInt32(DS.Tables[1].Rows[0]["Width"]));
                            txtQuantity.Text = Convert.ToString(DS.Tables[1].Rows[0]["Numbers"]);
                        }
                    }
                    else
                    {
                        Session["ActiveOption"] = "0";
                    }
                }
                int Quantity;
                string Area;
                string Length = string.Empty;
                string Width = string.Empty;
                if (txtQuantity.Text == String.Empty)
                {
                    Quantity = Convert.ToInt32("1");
                }
                else
                {
                    Quantity = Convert.ToInt32(txtQuantity.Text);
                }
                if (txtArea.Text == String.Empty)
                {
                    Area = Convert.ToString("1");
                }
                else
                {
                    Area = Convert.ToString(Convert.ToDecimal(txtArea.Text));
                }
                if(IsHaveLength == true && IsHaveWidth == false)
                {
                    Length = Convert.ToString(Convert.ToDecimal(DS.Tables[1].Rows[0]["Length"]));
                    MethodType = 1;
                }
                else if(IsHaveLength == false && IsHaveWidth == false)
                {
                    Width = Convert.ToString(Convert.ToDecimal(DS.Tables[1].Rows[0]["Width"]));
                    MethodType = 2;
                }
                int RoomPreferenceID = Convert.ToInt32(Session["RoomPreferenceID"]);
                int SubsubOptionL3ID = Convert.ToInt32(SubSubOptionL3ID);
                RoomTotalCost(RoomPreferenceID, SubsubOptionL3ID, Quantity, Area, MethodType, Length, Width);
                getProjectCost();
            }
        }
        catch (Exception eX) { }
    }

    public void ActiveSelection()
    {
        string RoomID = "0";
        if (Session["RoomID"] != null)
        {
            RoomID = Session["RoomID"].ToString();
        }
        string ThemeID = "0";
        if (Session["ThemeID"] != null)
        {
            ThemeID = Session["ThemeID"].ToString();
        }
        string ScopeID = "0";
        if (Session["ScopeID"] != null)
        {
            ScopeID = Session["ScopeID"].ToString();
        }
        string OptionID = "0";
        if (Session["OptionID"] != null)
        {
            OptionID = Session["OptionID"].ToString();
        }
        string SubOptionID = "0";
        if (Session["SubOptionID"] != null)
        {
            SubOptionID = Session["SubOptionID"].ToString();
        }
        string SubSubOptionID = "0";
        if (Session["SubSubOptionID"] != null)
        {
            SubSubOptionID = Session["SubSubOptionID"].ToString();
        }
        string SubSubOptionL2ID = "0";
        if (Session["SubSubOptionL2ID"] != null)
        {
            SubSubOptionL2ID = Session["SubSubOptionL2ID"].ToString();
        }
        string SubSubOptionL3ID = "0";
        if (Session["SubSubOptionL3ID"] != null)
        {
            SubSubOptionL3ID = Session["SubSubOptionL3ID"].ToString();
        }
        ScriptManager.RegisterStartupScript(this, GetType(), "class", "ChangeClass(" + RoomID + "," + ThemeID + "," + ScopeID + "," + OptionID + "," + SubSubOptionID + "," + SubOptionID + "," + SubSubOptionL2ID + "," + SubSubOptionL3ID + ");", true);
    }

    protected void lnkOption_Click(object sender, EventArgs e)
    {
        Session["OptionID"] = ((LinkButton)sender).CommandArgument;
        LoadSubOptions();
        ActiveSelection();
    }

    protected void ibOption_Click(object sender, ImageClickEventArgs e)
    {
        Session["OptionID"] = ((ImageButton)sender).CommandArgument;
        LoadSubOptions();
        ActiveSelection();
    }

    protected void lnkTheme_Click(object sender, EventArgs e)
    {
        Session["ThemeID"] = ((LinkButton)sender).CommandArgument;
        divOptionItems.Visible = false;
        divSubOptionItems.Visible = false;
        divSubSubOptionItems.Visible = false;
        LoadScopes();
        ActiveSelection();
    }

    protected void ibSubOption_Click(object sender, ImageClickEventArgs e)
    {
        try
        {
            Session["SubOptionID"] = ((ImageButton)sender).CommandArgument;
            LoadSubSubOptions();
            Session["SubsubOptionID"] = null;
            Session["SubsubOptionL2ID"] = null;
            Session["SubsubOptionL3ID"] = null;
            LoadSubsubOptionL2();
            LoadSubsubOptionL3();
            ActiveSelection();
        }
        catch (Exception eX) { }
    }

    protected void ibSubsubOption_Click(object sender, ImageClickEventArgs e)
    {
        try
        {
            Session["SubsubOptionID"] = ((ImageButton)sender).CommandArgument;
            LoadSubsubOptionL2();
            Session["SubsubOptionL2ID"] = null;
            Session["SubsubOptionL3ID"] = null;
            LoadSubsubOptionL3();
            ActiveSelection();
        }
        catch (Exception eX) { }
    }

    protected void ibSubsubOptionl2_Click(object sender, ImageClickEventArgs e)
    {
        try
        {
            Session["SubsubOptionL2ID"] = ((ImageButton)sender).CommandArgument;
            LoadSubsubOptionL3();
            Session["SubsubOptionL3ID"] = null;
            ActiveSelection();
        }
        catch (Exception eX) { }
    }

    protected void ibSubsubOptionL3_Click(object sender, ImageClickEventArgs e)
    {
        try
        {
            Session["SubsubOptionL3ID"] = ((ImageButton)sender).CommandArgument;
            divL3Details.Visible = true;
            LoadItemMeasurements();
            ActiveSelection();
        }
        catch (Exception eX) { }
    }

    public void CreateORUpdateRenovation()
    {
        string ErrorIfAny = string.Empty;
        DataSet DsRenovations = new DataSet();
        List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "CreateORUpdateRenovation @OptionID, @SubOptionID, @SubSubOptionID, @SubSubOptionL2ID, @SubSubOptionL3ID, @MethodType, @Length, @Width, @Height, " +
                                    " @Quantity, @Area,  @DCLength, @DCWidth, @DCHeight, @DCQuantity, @DCThickness, @RoomPreferenceID, @ScopeID, @ThemeID," +
                                    " @Lengthft,@Widthft,@Heightft,@Areaft";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("OptionID", Session["OptionID"] == null ? "0" : Session["OptionID"].ToString()));
            SqlParameters.Add(new SqlParameter("SubOptionID", Session["SubOptionID"] == null ? "0" : Session["SubOptionID"].ToString()));
            SqlParameters.Add(new SqlParameter("SubSubOptionID", Session["SubSubOptionID"] == null ? "0" : Session["SubSubOptionID"].ToString()));
            SqlParameters.Add(new SqlParameter("SubSubOptionL2ID", Session["SubSubOptionL2ID"] == null ? "0" : Session["SubSubOptionL2ID"].ToString()));
            SqlParameters.Add(new SqlParameter("SubSubOptionL3ID", Session["SubSubOptionL3ID"] == null ? "0" : Session["SubSubOptionL3ID"].ToString()));
            SqlParameters.Add(new SqlParameter("MethodType", MethodType));
            SqlParameters.Add(new SqlParameter("Length", txtLength.Text.ToString()));
            SqlParameters.Add(new SqlParameter("Width", txtWidth.Text.ToString()));
            SqlParameters.Add(new SqlParameter("Height", "0"));
            SqlParameters.Add(new SqlParameter("Quantity", txtQuantity.Text.ToString()));
            SqlParameters.Add(new SqlParameter("Area", txtArea.Text.ToString()));
            SqlParameters.Add(new SqlParameter("DCLength", txtDCLength.Text.ToString()));
            SqlParameters.Add(new SqlParameter("DCWidth", txtDCWidth.Text.ToString()));
            SqlParameters.Add(new SqlParameter("DCHeight", txtDCHeight.Text.ToString()));
            SqlParameters.Add(new SqlParameter("DCQuantity", txtDCQuantity.Text.ToString()));
            SqlParameters.Add(new SqlParameter("DCThickness", txtDCThickness.Text.ToString()));
            SqlParameters.Add(new SqlParameter("RoomPreferenceID", Session["RoomPreferenceID"].ToString()));
            SqlParameters.Add(new SqlParameter("ScopeID", Session["ScopeID"].ToString()));
            SqlParameters.Add(new SqlParameter("ThemeID", Session["ThemeID"].ToString()));
            SqlParameters.Add(new SqlParameter("Lengthft", lblLengthft.Text.ToString()));
            SqlParameters.Add(new SqlParameter("Widthft", lblWidthft.Text.ToString()));
            SqlParameters.Add(new SqlParameter("Heightft", "0"));
            SqlParameters.Add(new SqlParameter("Areaft", lblAreaft.Text.ToString()));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommand.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommand, out DsRenovations, out ErrorIfAny))
        {
            Session["EditScopeID"] = Session["ScopeID"].ToString();
            GetRoooms();
        }
    }

    public void SaveProjectCost()
    {
        try
        {
            string ErrorIfAny = String.Empty;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "ProjectCostUpdate @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", Session["ProjectID"].ToString()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                lblTotalAmount.Text = Tools.FormatMoneyWithDecimal(Convert.ToString(DS.Tables[0].Rows[0]["TotalProjectCost"]));
                lblRoomTotalCost.Text = Tools.FormatMoneyWithDecimal(Convert.ToString(DS.Tables[0].Rows[0]["RoomCost"]));
                lblWHRoomTotalCost.Text = Tools.FormatMoneyWithDecimal(Convert.ToString(DS.Tables[0].Rows[0]["RoomCost"]));
            }
        }
        catch (Exception eX) { }
    }

    public void getProjectCost()
    {
        try
        {
            string ErrorIfAny = String.Empty;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT ProjectCost FROM Projects WHERE ProjectID = @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", Session["ProjectID"].ToString()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                if (Convert.ToString(DS.Tables[0].Rows[0]["ProjectCost"]) == "0" || Convert.ToString(DS.Tables[0].Rows[0]["ProjectCost"]) == "")
                {
                    lblTotalAmount.Text = "0";
                }
                else
                {
                    lblTotalAmount.Text = Tools.FormatMoneyWithDecimal(Convert.ToString(DS.Tables[0].Rows[0]["ProjectCost"]));
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnSave_Click(object sender, EventArgs e)
    {
        try
        {
            if (Session["ActiveOption"].ToString() == "1" && Session["OptionID"] == null)
            {
                ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowAddItemModal();", true);
            }
            else if (Session["ActiveSubOption"].ToString() == "1" && Session["SubOptionID"] == null)
            {
                ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowAddItemModal();", true);
            }
            else if (Session["ActiveSubSubOption"].ToString() == "1" && Session["SubSubOptionID"] == null)
            {
                ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowAddItemModal();", true);
            }
            else if (Session["ActiveSubSubOptionL2"].ToString() == "1" && Session["SubSubOptionL2ID"] == null)
            {
                ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowAddItemModal();", true);
            }
            else if (Session["ActiveSubSubOptionL3"].ToString() == "1" && Session["SubSubOptionL3ID"] == null)
            {
                ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowAddItemModal();", true);
            }
            else
            {
                int Quantity = 0;
                string Area = "";
                string Length = "";
                string Width = "";
                int IsValidData = 0;
                if(IsHaveLength == true && IsHaveWidth == true)
                {
                    MethodType = 0;
                    if (txtLength.Text == String.Empty || txtWidth.Text == String.Empty || 
                        txtLength.Text == null || txtWidth.Text == null || txtLength.Text == "0" || txtWidth.Text == "0")
                    {
                        IsValidData = 0;
                        ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowInvalidDataAlertModal();", true);
                    }
                    else
                    {
                        if (txtLength.Text == String.Empty)
                        {
                            Length = Convert.ToString("1");
                        }
                        else
                        {
                            Length = Convert.ToString(Convert.ToDecimal(txtLength.Text));
                        }
                        if (txtWidth.Text == String.Empty)
                        {
                            Width = Convert.ToString("1");
                        }
                        else
                        {
                            Width = Convert.ToString(Convert.ToDecimal(txtWidth.Text));
                        }
                        if (ItemDataType == string.Empty)
                        {
                            IsValidData = 0;
                            ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowInvalidDataAlertModal();", true);
                        }
                        else if (ItemDataType == "1")
                        {
                            if (txtArea.Text == String.Empty || txtArea.Text == "0")
                            {
                                if (MethodType == 1 || MethodType == 2)
                                {
                                    IsValidData = 1;
                                }
                                else
                                {
                                    IsValidData = 0;
                                    ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowInvalidDataAlertModal();", true);
                                }
                            }
                            else
                            {
                                IsValidData = 1;
                                Area = Convert.ToString(Convert.ToDecimal(txtArea.Text));
                            }
                        }
                        else if (ItemDataType == "2")
                        {
                            if (txtQuantity.Text == String.Empty || txtQuantity.Text == "0")
                            {
                                IsValidData = 0;
                                ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowInvalidDataAlertModal();", true);
                            }
                            else
                            {
                                IsValidData = 1;
                                Quantity = Convert.ToInt32(txtQuantity.Text);
                            }
                        }
                        else
                        {
                            IsValidData = 1;
                            Quantity = Convert.ToInt32(txtQuantity.Text);
                            Area = Convert.ToString(Convert.ToDecimal(txtArea.Text));
                        }
                    }
                }
                else
                {
                    if (txtLength.Text == String.Empty)
                    {
                        Length = Convert.ToString("1");
                    }
                    else
                    {
                        Length = Convert.ToString(Convert.ToDecimal(txtLength.Text));
                    }
                    if (txtWidth.Text == String.Empty)
                    {
                        Width = Convert.ToString("1");
                    }
                    else
                    {
                        Width = Convert.ToString(Convert.ToDecimal(txtWidth.Text));
                    }
                    if (ItemDataType == string.Empty)
                    {
                        IsValidData = 0;
                        ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowInvalidDataAlertModal();", true);
                    }
                    else if (ItemDataType == "1")
                    {
                        if (txtArea.Text == String.Empty || txtArea.Text == "0")
                        {
                            if (MethodType == 1 || MethodType == 2)
                            {
                                IsValidData = 1;
                            }
                            else
                            {
                                IsValidData = 0;
                                ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowInvalidDataAlertModal();", true);
                            }
                        }
                        else
                        {
                            IsValidData = 1;
                            Area = Convert.ToString(Convert.ToDecimal(txtArea.Text));
                        }
                    }
                    else if (ItemDataType == "2")
                    {
                        if (txtQuantity.Text == String.Empty || txtQuantity.Text == "0")
                        {
                            IsValidData = 0;
                            ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowInvalidDataAlertModal();", true);
                        }
                        else
                        {
                            IsValidData = 1;
                            Quantity = Convert.ToInt32(txtQuantity.Text);
                        }
                    }
                    else
                    {
                        IsValidData = 1;
                        Quantity = Convert.ToInt32(txtQuantity.Text);
                        Area = Convert.ToString(Convert.ToDecimal(txtArea.Text));
                    }
                }

                ActiveSelection();
                if (IsValidData == 1)
                {
                    CreateORUpdateRenovation();
                    SaveProjectCost();
                    int RoomPreferenceID = Convert.ToInt32(Session["RoomPreferenceID"]);
                    int SubsubOptionL3ID = Convert.ToInt32(Session["SubSubOptionL3ID"]);
                    RoomTotalCost(RoomPreferenceID, SubsubOptionL3ID, Quantity, Area, MethodType, Length, Width);
                    ActiveSelection();
                    LoadScopeSavedData();
                }
            }
            clearControl();
        }
        catch { }
    }

    protected void clearControl()
    {
        try
        {
            txtLength.Text = string.Empty;
            txtWidth.Text = string.Empty;
            txtQuantity.Text = string.Empty;
            txtArea.Text = string.Empty;
            txtDCLength.Text = string.Empty;
            txtDCWidth.Text = string.Empty;
            txtDCHeight.Text = string.Empty;
            txtDCQuantity.Text = string.Empty;
            txtDCThickness.Text = string.Empty;
            lblLengthft.Text = string.Empty;
            lblWidthft.Text = string.Empty;
            lblAreaft.Text = string.Empty;
        }
        catch (Exception eX) { }
    }

    protected void BtnOk_Click(object sender, EventArgs e)
    {
        ActiveSelection();
        ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "CloseAddItemModal();", true);
    }

    protected void txtLength_TextChanged(object sender, EventArgs e)
    {
        try
        {
            ItemDataType = "1";
            double mmValue = 304.8;
            double SftValue = 92903.040000372;
            if (txtLength.Text != string.Empty && txtWidth.Text != string.Empty)
            {
                double Length = Convert.ToDouble(txtLength.Text);
                double width = Convert.ToDouble(txtWidth.Text);
                txtArea.Text = Convert.ToString(Convert.ToDecimal(txtLength.Text) * Convert.ToDecimal(txtWidth.Text));
                lblAreaft.Text = Convert.ToString(Math.Round((Convert.ToDouble(txtArea.Text) / SftValue), 2));
            }
            else
            {
                if (txtLength.Text == string.Empty)
                {
                    double width = Convert.ToDouble(txtWidth.Text);
                    txtArea.Text = Convert.ToString(1 * width);
                }
                else
                {
                    lblLengthft.Text = Convert.ToString(Math.Round(Convert.ToDouble(txtLength.Text) / mmValue, 2));
                    if (txtWidth.Text == string.Empty)
                    {
                        txtArea.Text = Convert.ToString(1 * Convert.ToDecimal(txtLength.Text));
                    }
                }
            }
            if (txtLength.Text != string.Empty)
            {
                lblLengthft.Text = Convert.ToString(Math.Round(Convert.ToDouble(txtLength.Text) / mmValue, 2));
            }
            if (txtWidth.Text != string.Empty)
            {
                lblWidthft.Text = Convert.ToString(Math.Round(Convert.ToDouble(txtWidth.Text) / mmValue, 2));
            }
        }
        catch (Exception eX) { }
    }

    protected void txtWidth_TextChanged(object sender, EventArgs e)
    {
        try
        {
            ItemDataType = "1";
            double mmValue = 304.8;
            double SftValue = 92903.040000372;
            if (txtLength.Text != string.Empty && txtWidth.Text != string.Empty)
            {
                double Length = Convert.ToDouble(txtLength.Text);
                double width = Convert.ToDouble(txtWidth.Text);

                txtArea.Text = Convert.ToString(Convert.ToDecimal(txtLength.Text) * Convert.ToDecimal(txtWidth.Text));
                lblAreaft.Text = Convert.ToString(Math.Round((Convert.ToDouble(txtArea.Text) / SftValue), 2));
            }
            else
            {
                if (txtLength.Text == string.Empty)
                {
                    double width = Convert.ToDouble(txtWidth.Text);
                    txtArea.Text = Convert.ToString(1 * Convert.ToDouble(txtWidth.Text));
                }
                else
                {
                    lblLengthft.Text = Convert.ToString(Math.Round(Convert.ToDouble(txtLength.Text) / mmValue, 2));
                    if (txtWidth.Text == string.Empty)
                    {
                        double Length = Convert.ToDouble(txtLength.Text);
                        txtArea.Text = Convert.ToString(1 * Length);
                    }
                }
            }
            if (txtLength.Text != string.Empty)
            {
                lblLengthft.Text = Convert.ToString(Math.Round(Convert.ToDouble(txtLength.Text) / mmValue, 2));
            }
            if (txtWidth.Text != string.Empty)
            {
                lblWidthft.Text = Convert.ToString(Math.Round(Convert.ToDouble(txtWidth.Text) / mmValue, 2));
            }
        }
        catch { }
    }

    protected void txtDCLength_TextChanged(object sender, EventArgs e)
    {
        try
        {
            double mmValue = 304.8;
            if (txtDCLength.Text != string.Empty)
            {
                int Length = Convert.ToInt32(Convert.ToInt32(txtDCLength.Text) * mmValue);
                lblDCLengthmm.Text = Convert.ToString(Length);
            }
        }
        catch { }
    }

    protected void txtDCWidth_TextChanged(object sender, EventArgs e)
    {
        try
        {
            double mmValue = 304.8;
            if (txtDCWidth.Text != string.Empty)
            {
                int width = Convert.ToInt32(Convert.ToInt32(txtDCWidth.Text) * mmValue);
                lblDCWidthmm.Text = Convert.ToString(width);
            }
        }
        catch { }
    }

    protected void txtDCHeight_TextChanged(object sender, EventArgs e)
    {
        try
        {
            double mmValue = 304.8;
            if (txtDCHeight.Text != string.Empty)
            {
                int Height = Convert.ToInt32(Convert.ToInt32(txtDCHeight.Text) * mmValue);
                lblDCHeightmm.Text = Convert.ToString(Height);
            }
        }
        catch { }
    }

    protected void txtDCThickness_TextChanged(object sender, EventArgs e)
    {
        try
        {
            double mmValue = 304.8;
            if (txtDCHeight.Text != string.Empty)
            {
                int Thickness = Convert.ToInt32(Convert.ToInt32(txtDCThickness.Text) * mmValue);
                lblDCThicknessmm.Text = Convert.ToString(Thickness);
            }
        }
        catch { }
    }

    public void RoomTotalCost(int RoomPreferenceID, int SubsubOptionL3ID, int Quantity, string Area, int MethodType, string Length, string Width)
    {
        try
        {
            string ErrorIfAny = string.Empty;
            DataSet Ds = new DataSet();
            List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetRoomTotalCost @RoomPreferenceID, @SubsubOptionL3ID,@ThemeID,@ScopeID,@OptionID, @Quantity, @Area";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("@RoomPreferenceID", RoomPreferenceID));
                SqlParameters.Add(new SqlParameter("@SubsubOptionL3ID", SubsubOptionL3ID));
                SqlParameters.Add(new SqlParameter("@ThemeID", Convert.ToInt32(Session["ThemeID"])));
                SqlParameters.Add(new SqlParameter("@ScopeID", Convert.ToInt32(Session["ScopeID"])));
                SqlParameters.Add(new SqlParameter("@OptionID", Convert.ToInt32(Session["OptionID"])));
                SqlParameters.Add(new SqlParameter("@Quantity", Quantity));
                SqlParameters.Add(new SqlParameter("@Area", Area));
                SqlParameters.Add(new SqlParameter("@MethodType", MethodType));
                SqlParameters.Add(new SqlParameter("@Length", Length));
                SqlParameters.Add(new SqlParameter("@Width", Width));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommand.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommand, out Ds, out ErrorIfAny))
            {
                lblRoomTotalCost.Text = Tools.FormatMoneyWithDecimal(Convert.ToString(Ds.Tables[0].Rows[0]["TotalRoomCost"]));
                lblWHRoomTotalCost.Text = Tools.FormatMoneyWithDecimal(Convert.ToString(Ds.Tables[0].Rows[0]["TotalRoomCost"]));
            }
        }
        catch { }
    }

    protected void btnRoomCostCalculate_Click(object sender, EventArgs e)
    {
        try
        {
            int Quantity;
            string Area;
            string Length;
            string Width;
            if (txtQuantity.Text == String.Empty)
            {
                Quantity = Convert.ToInt32("1");
            }
            else
            {
                Quantity = Convert.ToInt32(txtQuantity.Text);
            }
            if (txtArea.Text == String.Empty)
            {
                Area = Convert.ToString("1");
            }
            else
            {
                Area = Convert.ToString(Convert.ToDecimal(txtArea.Text));
            }
            if (txtLength.Text == String.Empty)
            {
                Length = Convert.ToString("1");
            }
            else
            {
                Length = Convert.ToString(Convert.ToDecimal(txtLength.Text));
            }
            if (txtWidth.Text == String.Empty)
            {
                Width = Convert.ToString("1");
            }
            else
            {
                Width = Convert.ToString(Convert.ToDecimal(txtWidth.Text));
            }
            int RoomPreferenceID = Convert.ToInt32(Session["RoomPreferenceID"]);
            int SubsubOptionL3ID = Convert.ToInt32(SubSubOptionL3ID);
            RoomTotalCost(RoomPreferenceID, SubsubOptionL3ID, Quantity, Area, MethodType, Length, Width);
            ActiveSelection();
        }
        catch { }
    }

    protected void lnkRemoveItem_Click(object sender, EventArgs e)
    {
        try
        {
            string ScopesinProjectRoomID = ((Button)sender).CommandArgument;
            string ErrorIfAny = String.Empty;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UPDATE Scopes_in_ProjectRooms SET IsActive=0  WHERE Scopes_in_ProjectRoomID = @Scopes_in_ProjectRoomID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("Scopes_in_ProjectRoomID", ScopesinProjectRoomID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                LoadScopeSavedData();
                SaveProjectCost();
                GetRoooms();
                Initialize();
            }
        }
        catch (Exception eX) { }
    }


    protected void btnProceed_Click(object sender, EventArgs e)
    {
        try
        {
            string ErrorIfAny = String.Empty;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "CheckProjectRoomSave @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", Session["ProjectID"].ToString()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                if (Convert.ToString(DS.Tables[0].Rows[0]["IsFullySaved"]) == "1")
                {
                    Response.Redirect("CheckOut.aspx");
                }
                else
                {
                    ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowAddItemModal();", true);
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void lnkOptions_Click(object sender, EventArgs e)
    {
        Session["OptionID"] = ((LinkButton)sender).CommandArgument;
        LoadSubOptions();
        ActiveSelection();
    }

    protected void loadWHScopes()
    {
        try
        {
            string ErrorIfAny = "";
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetWholeApartmentScopesByRoomID @RoomID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("@RoomID", Session["RoomID"].ToString()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM Scopes_In_Project_WApartment INNER JOIN RoomPreference ON RoomPreference.RoomPreferenceID = Scopes_In_Project_WApartment.RoomPreferenceID " +
                                       " WHERE RoomPreference.RoomPreferenceID = " + Session["RoomPreferenceID"].ToString() + "";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("@RoomID", Session["RoomID"].ToString()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                if (DS.Tables[0].Rows.Count > 0)
                {
                    if (DS.Tables[1].Rows.Count > 0)
                    {
                        Session["WHScopeID"] = Convert.ToString(DS.Tables[1].Rows[0]["ScopeID"]);
                        Session["WHOptionID"] = Convert.ToString(DS.Tables[1].Rows[0]["WHOptionID"]);
                        loadWHOptions();
                    }
                    else
                    {
                        Session["ActiveWHOptionID"] = "0";
                        divDetailHead.Visible = false;
                        divWHDetails.Visible = false;
                        activeSelectionWholeApartment();
                    }
                }
                rptWHScopes.DataSource = DS.Tables[0];
                rptWHScopes.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void loadWHOptions()
    {
        try
        {
            string ErrorIfAny = "";
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetWHOptionByScope @ScopeID, @RoomID, @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", Session["WHScopeID"].ToString()));
                SqlParameters.Add(new SqlParameter("RoomID", Session["RoomID"].ToString()));
                SqlParameters.Add(new SqlParameter("ProjectID", Session["ProjectID"].ToString()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM WHOptions WHERE WHOptionID = @WHOptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("WHOptionID", Session["WHOptionID"]));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                divWHDetails.Visible = true;
                divWHSave.Visible = true;
                if (DS.Tables[0].Rows.Count > 0)
                {
                    Session["ActiveWHScopeID"] = "1";
                    Session["ActiveWHOptionID"] = "1";
                    divDetailHead.Visible = true;
                    rptWHOptions.DataSource = DS.Tables[0];
                    rptWHOptions.DataBind();
                    divWHOptionItems.Visible = true;
                    lblWHScope.Text = Convert.ToString(DS.Tables[1].Rows[0]["Scope"]);
                    lblWHScopeName.Text = Convert.ToString(DS.Tables[1].Rows[0]["Scope"]);
                    StringBuilder sbString = new StringBuilder();
                    if (DS.Tables[2].Rows.Count > 0)
                    {
                        lblWHOption.Text = Convert.ToString(DS.Tables[2].Rows[0]["WHOptionName"]);
                    }
                    else
                    {
                        lblWHOption.Text = Convert.ToString(DS.Tables[0].Rows[0]["WHOptionName"]);
                    }
                    lblWHPackagePrice.Text = Convert.ToString(DS.Tables[2].Rows[0]["Amount"]);
                    if (Convert.ToString(DS.Tables[2].Rows[0]["Type"]) == "1")
                    {
                        if (Convert.ToString(DS.Tables[2].Rows[0]["WHContentImageURL"]) == "" || Convert.ToString(DS.Tables[2].Rows[0]["WHContentImageURL"]) == null)
                        {
                            sbString.Append("<div><p>Not have any description.</p></div>");
                        }
                        else
                        {
                            sbString.Append("<img class='hnm-img-slider__for-item' src='" + Convert.ToString(DS.Tables[2].Rows[0]["WHContentImageURL"]) + "' >");
                        }
                    }
                    else
                    {
                        if (Convert.ToString(DS.Tables[2].Rows[0]["WHContent"]) == "" || Convert.ToString(DS.Tables[2].Rows[0]["WHContent"]) == null)
                        {
                            sbString.Append("<div><p>Not have any description.</p></div>");
                        }
                        else
                        {
                            sbString.Append("<div>" + HttpUtility.HtmlDecode(Convert.ToString(DS.Tables[2].Rows[0]["WHContent"])) + "</div>");
                        }
                    }
                    litWHOptionContent.Text = sbString.ToString();
                }
                GetWholeApartmentRoomCost();
                activeSelectionWholeApartment();
            }
        }
        catch (Exception eX) { }
    }

    protected void ibWHScope_Click(object sender, ImageClickEventArgs e)
    {
        try
        {
            ImageButton lnk = (ImageButton)sender;
            string WHScopeID = lnk.CommandArgument;
            Session["WHScopeID"] = WHScopeID.ToString();
            Session["ActiveWHScopeID"] = "1";
            Session["ActiveWHOptionID"] = "0";
            divWHSave.Visible = false;
            string ErrorIfAny = "";
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetWHOptionByScope @ScopeID, @RoomID, @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", Session["WHScopeID"].ToString()));
                SqlParameters.Add(new SqlParameter("RoomID", Session["RoomID"].ToString()));
                SqlParameters.Add(new SqlParameter("ProjectID", Session["ProjectID"].ToString()));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                divWHOptionItems.Visible = true;
                lblWHScope.Text = Convert.ToString(DS.Tables[1].Rows[0]["Scope"]);
                lblWHScopeName.Text = Convert.ToString(DS.Tables[1].Rows[0]["Scope"]);
                loadWHScopes();
                rptWHOptions.DataSource = DS.Tables[0];
                rptWHOptions.DataBind();
                activeSelectionWholeApartment();
            }
        }
        catch (Exception eX) { }
    }

    protected void lnkWHOptions_Click(object sender, EventArgs e)
    {
        try
        {
            LinkButton lnk = (LinkButton)sender;
            string WHOptionID = lnk.CommandArgument;
            Session["WHOptionID"] = WHOptionID.ToString();
            Session["ActiveWHOptionID"] = "1";
            loadWHOptions();
        }
        catch (Exception eX) { }
    }

    protected void activeSelectionWholeApartment()
    {
        try
        {
            string ThemeID = "0";
            if (Session["ThemeID"] != null)
            {
                ThemeID = Session["ThemeID"].ToString();
            }
            string WHScopeID = "0";
            if (Session["WHScopeID"] != null)
            {
                WHScopeID = Session["WHScopeID"].ToString();
            }
            string WHOptionID = "0";
            if (Session["WHOptionID"] != null)
            {
                WHOptionID = Session["WHOptionID"].ToString();
            }
            ScriptManager.RegisterStartupScript(this, GetType(), "class", "ChangeWHClass(" + ThemeID + "," + WHScopeID + "," + WHOptionID + ");", true);
        }
        catch (Exception eX) { }
    }

    protected void btnWHSave_Click(object sender, EventArgs e)
    {
        try
        {
            if (Session["ActiveWHScopeID"].ToString() == "1" && Session["WHScopeID"] == null)
            {
                ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowAddItemModal();", true);
            }
            else if (Session["ActiveWHOptionID"].ToString() == "1" && Session["WHOptionID"] == null)
            {
                ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "ShowAddItemModal();", true);
            }
            else
            {
                CreateORUpdateProjectWholeApartment();
                SaveProjectCost();
                GetWholeApartmentRoomCost();
                loadWHOptions();
            }
        }
        catch (Exception eX) { }
    }

    protected void GetWholeApartmentRoomCost()
    {
        try
        {
            string ErrorIfAny = string.Empty;
            DataSet ds = new DataSet();
            List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetWholeApartmentRoomCost @RoomPreferenceID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("@RoomPreferenceID", Session["RoomPreferenceID"]));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommand.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommand, out ds, out ErrorIfAny))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    lblWHRoomTotalCost.Text = Convert.ToString(ds.Tables[0].Rows[0]["TotalRoomCost"]);
                }
            }
        }
        catch (Exception eX) { }
    }

    public void CreateORUpdateProjectWholeApartment()
    {
        string ErrorIfAny = string.Empty;
        DataSet DsRenovations = new DataSet();
        List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "AddOrUpdateProjectWholeApartment @ScopeID,@RoomPreferenceID,@WHOptionID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("@ScopeID", Session["WHScopeID"]));
            SqlParameters.Add(new SqlParameter("@RoomPreferenceID", Session["RoomPreferenceID"]));
            SqlParameters.Add(new SqlParameter("@WHOptionID", Session["WHOptionID"]));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommand.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommand, out DsRenovations, out ErrorIfAny))
        {
            Session["EditWHScopeID"] = Session["WHScopeID"].ToString();
            GetRoooms();
        }
    }

    protected void lnkThemeImage_Click(object sender, EventArgs e)
    {
        try
        {
            LinkButton lnk = (LinkButton)sender;
            string themeID = lnk.CommandArgument;
            string Error = "";
            DataSet ds = new DataSet();
            StringBuilder sbImageSlider = new StringBuilder();
            StringBuilder sbbottomdiv = new StringBuilder();
            StringBuilder sbImageThemeOme = new StringBuilder();
            StringBuilder sbImageThemeZoom = new StringBuilder();
            List<Tools.SqlContainer> SQLCommandsImg = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainerImg = new Tools.SqlContainer();
                SQLContainerImg.Query = "GetThemeImagesForSliderByID @ThemeID";
                List<SqlParameter> SqlParametersImg = new List<SqlParameter>();
                SqlParametersImg.Add(new SqlParameter("ThemeID", themeID.ToString()));
                SQLContainerImg.SqlParameters = SqlParametersImg;
                SQLCommandsImg.Add(SQLContainerImg);
            }
            if (!Tools.GetData(SQLCommandsImg, out ds, out Error)) { }
            else
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    rptSliderFor.DataSource = ds.Tables[0];
                    rptSliderFor.DataBind();
                    rptSliderNav.DataSource = ds.Tables[0];
                    rptSliderNav.DataBind();
                    sbbottomdiv.Append("<div class='modal-backdrop fade show' id='divModalBottom'></div>");
                    litdivmodalbottom.Text = litdivmodalbottom.Text + sbbottomdiv.ToString();
                    ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "OpenThemeModal();", true);
                }
            }
        }
        catch (Exception eX) { }
    }
    protected void imgModalColse_Click(object sender, ImageClickEventArgs e)
    {
        try
        {
            StringBuilder sbbottomdiv = new StringBuilder();
            sbbottomdiv.Append("<div class=''></div>");
            litdivmodalbottom.Text = sbbottomdiv.ToString();
            ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "CloseThemeModal();", true);
        }
        catch (Exception eX) { }
    }

    protected void btnValidPopUpClose_Click(object sender, EventArgs e)
    {
        ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "CloseInvalidDataAlertModal();", true);
    }

    protected void txtQuantity_TextChanged(object sender, EventArgs e)
    {
        try
        {
            ItemDataType = "2";
        }
        catch (Exception eX) { }
    }
}