using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_ManageThemeProperties : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if(!IsPostBack)
        {
            ddlPropertyType.DataBind();
        }
        GridThemeProperties.DataBind();
    }

    protected void lnkNew_Click(object sender, EventArgs e)
    {
        divForm.Visible = true;
        divGrid.Visible = false;
        ddlPropertyType.DataBind();
        ddlSaveType.DataBind();
        lnkNew.Visible = false;
    }

    protected void ddlPropertyType_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            string ErrorIfAny = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT PropertyTypeRoomID, NoOfRoom FROM PropertyTypeRooms WHERE PropertyTypeID = @PropertyTypeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PropertyTypeID", ddlPropertyType.SelectedValue));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    ddlRooms.DataSource = ds.Tables[0];
                    ddlRooms.DataBind();
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnSave_Click(object sender, EventArgs e)
    {
        try
        {
            string ErrorIfAny = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "AddThemeProperties @ThemeID, @SaveType, @PropertyTypeID, @PropertyTypeRoomID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ThemeID", Session["ThemeID"]));
                SqlParameters.Add(new SqlParameter("SaveType", ddlSaveType.SelectedValue));
                SqlParameters.Add(new SqlParameter("PropertyTypeID", ddlPropertyType.SelectedValue));
                SqlParameters.Add(new SqlParameter("PropertyTypeRoomID", ddlRooms.SelectedValue));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                if(Convert.ToString(ds.Tables[0].Rows[0]["IsExists"]) == "0" )
                {
                    GridThemeProperties.DataBind();
                    ErrorDisplay.ShowAlertMessage("Successfully Done");
                    divForm.Visible = false;
                    divGrid.Visible = true;
                    ddlPropertyType.DataBind();
                    ddlSaveType.DataBind();
                    lnkNew.Visible = true;
                }
                else
                {
                    ErrorDisplay.ShowAlertMessage("Already Exists");
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        divForm.Visible = false;
        divGrid.Visible = true;
        ddlPropertyType.DataBind();
        lnkNew.Visible = true;
        ddlSaveType.DataBind();
    }
}