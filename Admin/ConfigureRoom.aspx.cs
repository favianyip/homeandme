using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Data;
using System.Data.SqlClient;
using DevExpress.Web.ASPxTreeList;
using System.Configuration;

public partial class Admin_ConfigureRoom : System.Web.UI.Page
{
    string RoomID = string.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            if (Session["RoomID"] == null)
            {
                Response.Redirect("/Admin/ManageRoomSettings.aspx");
            }
            else
            {
                RoomID = Session["RoomID"].ToString();
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
                SQLContainer.Query = "SELECT ScopeID, Scope FROM Scopes";
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
            bool IsWholeApartment = IsWholeApartmentCheck();
            if (!IsWholeApartment)
            {
                string err = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "GetOptionListingByScope @ScopeID, @RoomID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                    SqlParameters.Add(new SqlParameter("RoomID", RoomID));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    divWHOptions.Visible = false;
                    divRoomsGrid.Visible = true;
                    lblMsg.Text = "";
                    Session["ScopeID"] = Convert.ToString(cmbScopes.SelectedItem.Value);
                    GridRoomOptions.DataBind();
                    if (Convert.ToString(cmbScopes.SelectedItem.Value) != "-1")
                    {
                    }
                }
            }
            else
            {
                divRoomsGrid.Visible = false;
                divWHOptions.Visible = true;
                divWHOptionForm.Visible = false;
                Session["ScopeID"] = Convert.ToString(cmbScopes.SelectedItem.Value);
                GridWHOptions.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void BindData()
    {
        GridAssignedRoomOptions.DataBind();
        GridRoomOptions.DataBind();
    }

    protected void btnAssign_Click(object sender, EventArgs e)
    {
        try
        {
            string RoomId = RoomID;
            string ErrorIfAny = string.Empty;
            List<object> ids = new List<object>();
            ids = GridRoomOptions.GetSelectedFieldValues("SubsubOptionL3ID");

            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            foreach (object id in ids)
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "INSERT INTO RoomConfigurations (RoomID, SubsubOptionL3ID, ScopeID) VALUES (@RoomID, @SubsubOptionL3ID, @ScopeID)";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("RoomID", RoomId));
                SqlParameters.Add(new SqlParameter("SubsubOptionL3ID", id));
                SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.ExecuteSQL(SQLCommands, out ErrorIfAny))
            {
                lblMsg.Text = "Error while assigning the items, please try again.";
            }
            else
            {
                lblMsg.Text = "";
                BindData();
                GridRoomOptions.Selection.UnselectAll();
            }
        }
        catch (Exception eX) { }
    }

    protected void btnRemove_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            string RoomConfigureID = ((LinkButton)sender).CommandArgument;
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "DELETE FROM RoomConfigurations WHERE RoomConfigureID =  @RoomConfigureID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("RoomConfigureID", RoomConfigureID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            Tools.ExecuteSQL(SQLCommands, out err);
            BindData();
        }
        catch (Exception ex) { }
    }

    bool IsWholeApartmentCheck()
    {
        bool IsWholeApartment = false;
        string err = "";
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT * FROM Rooms WHERE RoomID = @RoomID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("RoomID", Session["RoomID"]));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                if (Convert.ToString(ds.Tables[0].Rows[0]["IsWholeApartment"]) == "1")
                {
                    IsWholeApartment = true;
                }
            }
        }
        return IsWholeApartment;
    }

    protected void btnAddNewWHOptions_Click(object sender, EventArgs e)
    {
        try
        {
            clearControls();
            hdnWHOptionID.Value = "-1";
            btnAddNewWHOptions.Visible = false;
            divWHOptions.Visible = false;
            divWHOptionForm.Visible = true;
            ddlPropertyType.DataBind();
        }
        catch (Exception eX) { }
    }

    void clearControls()
    {
        try
        {
            divImage.Visible = false;
            divHTMLContent.Visible = false;
            txtWHName.Text = String.Empty;
            txtWHAmount.Text = String.Empty;
            ddlWHOptionType.SelectedValue = "-1";
            ckHTML.Text = String.Empty;
        }
        catch (Exception eX) { }
    }

    protected void btnWHOptionSave_Click(object sender, EventArgs e)
    {
        try
        {
            string ImageName = string.Empty;
            string ImageFileName = string.Empty;
            string ImageFileID = "";
            if (Session["File"] != null)
            {
                string Error = String.Empty;
                Dictionary<string, string> files = new Dictionary<string, string>();
                files = ((Dictionary<string, string>)Session["File"]);
                if (files.ContainsKey("WHOPtionImage"))
                {
                    String NewFilePath = String.Empty;
                    string filePath = files["WHOPtionImage"];
                    string BucketName = ConfigurationManager.AppSettings["S3BucketName"];
                    string FolderName = "project-hnm/WholeApartmentOptionImages/";
                    ImageFileID = Tools.SaveImage(filePath, BucketName, FolderName, out Error);
                    string err = "";
                    DataSet dS = new DataSet("ds");
                    List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT * FROM Files WHERE FileID = @FileID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("FileID", ImageFileID));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommand.Add(SQLContainer);
                    }
                    if (Tools.GetData(SQLCommand, out dS, out err))
                    {
                        if (dS.Tables[0].Rows.Count > 0)
                        {
                            ImageFileName = Convert.ToString(dS.Tables[0].Rows[0]["FilePathInServer"]);
                        }
                    }
                }
                Session.Remove("File");
            }
            if (hdnWHOptionID.Value == "-1")
            {
                string ErrorIfAny = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "AddWHOptionDetails @WHOptionName, @RoomID, @ScopeID, @Status, @Type, @WHContent, @WHContentImageURL, @Amount, @PropertyTypeRoomID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("WHOptionName", txtWHName.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("RoomID", Session["RoomID"].ToString()));
                    SqlParameters.Add(new SqlParameter("ScopeID", Session["ScopeID"].ToString()));
                    SqlParameters.Add(new SqlParameter("Status", ddlStatus.SelectedValue));
                    SqlParameters.Add(new SqlParameter("Type", ddlWHOptionType.SelectedValue));
                    if (ddlWHOptionType.SelectedValue == "1")
                    {
                        if (Convert.ToString(ImageFileName) == "" || Convert.ToString(ImageFileName) == null)
                        {
                            SqlParameters.Add(new SqlParameter("WHContent", DBNull.Value));
                            SqlParameters.Add(new SqlParameter("WHContentImageURL", DBNull.Value));
                        }
                        else
                        {
                            SqlParameters.Add(new SqlParameter("WHContent", DBNull.Value));
                            SqlParameters.Add(new SqlParameter("WHContentImageURL", ImageFileName.ToString()));
                        }
                    }
                    else if (ddlWHOptionType.SelectedValue == "2")
                    {
                        SqlParameters.Add(new SqlParameter("WHContent", HttpUtility.HtmlEncode(ckHTML.Text.Trim())));
                        SqlParameters.Add(new SqlParameter("WHContentImageURL", DBNull.Value));
                    }
                    SqlParameters.Add(new SqlParameter("Amount", txtWHAmount.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("PropertyTypeRoomID", ddlPropertyType.SelectedValue));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                {
                    btnAddNewWHOptions.Visible = true;
                    divWHOptions.Visible = true;
                    divWHOptionForm.Visible = false;
                    GridWHOptions.DataBind();
                    clearControls();
                }
            }
            else
            {
                string ErrorIfAny = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "UpdateWHOptionsDetails @WHOptionName, @RoomID, @ScopeID, @Status, @Type, @WHContent, @WHContentImageURL, @Amount, @PropertyTypeRoomID, @WHOptionID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("WHOptionName", txtWHName.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("RoomID", Session["RoomID"].ToString()));
                    SqlParameters.Add(new SqlParameter("ScopeID", Session["ScopeID"].ToString()));
                    SqlParameters.Add(new SqlParameter("Status", ddlStatus.SelectedValue));
                    SqlParameters.Add(new SqlParameter("Type", ddlWHOptionType.SelectedValue));
                    if (ddlWHOptionType.SelectedValue == "1")
                    {
                        if (Convert.ToString(ImageFileName) == "" || Convert.ToString(ImageFileName) == null)
                        {
                            if (imgWHOption.ImageUrl == "" || imgWHOption.ImageUrl == null)
                            {
                                SqlParameters.Add(new SqlParameter("WHContent", DBNull.Value));
                                SqlParameters.Add(new SqlParameter("WHContentImageURL", DBNull.Value));
                            }
                            else
                            {
                                SqlParameters.Add(new SqlParameter("WHContent", DBNull.Value));
                                SqlParameters.Add(new SqlParameter("WHContentImageURL", imgWHOption.ImageUrl));
                            }
                        }
                        else
                        {
                            SqlParameters.Add(new SqlParameter("WHContent", DBNull.Value));
                            SqlParameters.Add(new SqlParameter("WHContentImageURL", ImageFileName.ToString()));
                        }
                    }
                    else if (ddlWHOptionType.SelectedValue == "2")
                    {
                        SqlParameters.Add(new SqlParameter("WHContent", HttpUtility.HtmlEncode(ckHTML.Text.Trim())));
                        SqlParameters.Add(new SqlParameter("WHContentImageURL", DBNull.Value));
                    }
                    SqlParameters.Add(new SqlParameter("Amount", txtWHAmount.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("PropertyTypeRoomID", ddlPropertyType.SelectedValue));
                    SqlParameters.Add(new SqlParameter("WHOptionID", hdnWHOptionID.Value));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                {
                    btnAddNewWHOptions.Visible = true;
                    divWHOptions.Visible = true;
                    divWHOptionForm.Visible = false;
                    GridWHOptions.DataBind();
                    clearControls();
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void propertyTypeUpdateorInsert(string WHOptionID)
    {
        try
        {
            string ErrorIfAny = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "DELETE FROM PropertyTypeRoomWHOptions WHERE WHOptionID = @WHOptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("WHOptionID", WHOptionID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommand.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommand, out ds, out ErrorIfAny)) { }
        }
        catch (Exception eX) { }
    }

    protected void btnWHOptionCancel_Click(object sender, EventArgs e)
    {
        try
        {
            btnAddNewWHOptions.Visible = true;
            divWHOptions.Visible = true;
            divWHOptionForm.Visible = false;
            GridWHOptions.DataBind();
            clearControls();
        }
        catch (Exception eX) { }
    }

    protected void ddlWHOptionType_SelectedIndexChanged(object sender, EventArgs e)
    {
        if (ddlWHOptionType.SelectedValue == "1")
        {
            divImage.Visible = true;
            divHTMLContent.Visible = false;
        }
        else if (ddlWHOptionType.SelectedValue == "2")
        {
            divImage.Visible = false;
            divHTMLContent.Visible = true;
        }
        else
        {
            divImage.Visible = false;
            divHTMLContent.Visible = false;
        }
    }

    protected void btnWHGridEdit_Click(object sender, EventArgs e)
    {
        try
        {
            LinkButton lnk = (LinkButton)sender;
            hdnWHOptionID.Value = lnk.CommandArgument;
            btnAddNewWHOptions.Visible = false;
            divWHOptions.Visible = false;
            divWHOptionForm.Visible = true;
            ddlPropertyType.DataBind();
            string err = "";
            DataSet dS = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommand = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM WHOptions WHERE WHOptionID = @WHOptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("WHOptionID", hdnWHOptionID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommand.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommand, out dS, out err))
            {
                if (dS.Tables[0].Rows.Count > 0)
                {
                    txtWHName.Text = Convert.ToString(dS.Tables[0].Rows[0]["WHOptionName"]);
                    txtWHAmount.Text = Convert.ToString(dS.Tables[0].Rows[0]["Amount"]);
                    ddlWHOptionType.SelectedValue = Convert.ToString(dS.Tables[0].Rows[0]["Type"]);
                    ddlStatus.SelectedValue = Convert.ToString(dS.Tables[0].Rows[0]["Status"]);
                    ddlPropertyType.SelectedValue = Convert.ToString(dS.Tables[0].Rows[0]["PropertyTypeRoomID"]);
                    if (Convert.ToString(dS.Tables[0].Rows[0]["Type"]) == "1")
                    {
                        divImage.Visible = true;
                        divHTMLContent.Visible = false;
                        imgWHOption.ImageUrl = Convert.ToString(dS.Tables[0].Rows[0]["WHContentImageURL"]);
                        ckHTML.Text = String.Empty;
                    }
                    else if (Convert.ToString(dS.Tables[0].Rows[0]["Type"]) == "2")
                    {
                        divImage.Visible = false;
                        divHTMLContent.Visible = true;
                        imgWHOption.ImageUrl = String.Empty;
                        ckHTML.Text = HttpUtility.HtmlDecode(dS.Tables[0].Rows[0]["WHContent"].ToString().Trim());
                    }
                    else
                    {
                        divImage.Visible = true;
                        divHTMLContent.Visible = true;
                        imgWHOption.ImageUrl = String.Empty;
                        ckHTML.Text = String.Empty;
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void ddlPropertyType_SelectedIndexChanged(object sender, EventArgs e) { }
}