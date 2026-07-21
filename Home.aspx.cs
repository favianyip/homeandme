using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;

public partial class Home : System.Web.UI.Page
{
    string ErrorIfAny = String.Empty;
    string PropertyTypeID = String.Empty;
    string FlatTypeID = String.Empty;
    int PropertyTypeRoomID = 0;
    string UserID = String.Empty;
    string ProjectID = String.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        if (!IsPostBack)
        {
            drpPropertyType.DataBind();
            drpPropertyType_SelectedIndexChanged(sender, e);
        }
    }

    protected void lnkProceed_Click(object sender, EventArgs e)
    {
        try
        {
            PropertyTypeID = drpPropertyType.SelectedValue.ToString();
            FlatTypeID = drpFlatType.SelectedValue.ToString();
            PropertyTypeRoomID = Convert.ToInt32(drpBedRooms.SelectedValue.ToString());
            UserID = "-1";

            if (Session["UserID"] != null && Session["UserID"] != "")
            {
                UserID = Session["UserID"].ToString();
            }

            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "CreateProject @UserID, @RenovateBy, @PropertyTypeID, @PropertyTypeRoomID, @FlatTypeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("UserID", UserID));
                SqlParameters.Add(new SqlParameter("RenovateBy", "1"));
                SqlParameters.Add(new SqlParameter("PropertyTypeID", PropertyTypeID));
                SqlParameters.Add(new SqlParameter("PropertyTypeRoomID", PropertyTypeRoomID));
                SqlParameters.Add(new SqlParameter("FlatTypeID", FlatTypeID));
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
                    ProjectID = DS.Tables[0].Rows[0][0].ToString();
                    Session["ProjectID"] = ProjectID;
                   // InsertRoomPreference(PropertyTypeRoomID, ProjectID);
                    Session["ScopeID"] = null;
                    Session["OptionID"] = null;
                    Session["SubOptionID"] = null;
                    Session["SubSubOptionID"] = null;
                    Session["SubSubOptionL2ID"] = null;
                    Session["SubSubOptionL3ID"] = null;
                    //Response.Redirect("/CustomizeYourRoom.aspx");
                    Response.Redirect("/room.aspx");
                }
            }
        }
        catch (Exception ex) { }
    }

    void InsertRoomPreference(int PropertyTypeRoomID, string ProjectID)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "InsertRoomPreference @ProjectID, @PropertyTypeRoomID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SqlParameters.Add(new SqlParameter("PropertyTypeRoomID", PropertyTypeRoomID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            Tools.GetData(SQLCommands, out DS, out ErrorIfAny);
        }
        catch (Exception ex) { }
    }

    protected void drpPropertyType_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT PropertyTypeRoomID, NoOfRoom FROM PropertyTypeRooms WHERE PropertyTypeID = @PropertyTypeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PropertyTypeID", drpPropertyType.SelectedValue));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                drpBedRooms.DataSource = DS.Tables[0];
                drpBedRooms.DataBind();
            }
        }
        catch (Exception eX) { }
    }
}