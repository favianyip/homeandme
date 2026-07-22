using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.Drawing;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;


public partial class Admin_ManageThemeTest : System.Web.UI.Page
{
    string ErrorIfAny = String.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        Session["RoomID"] = "18";
        if (Session["RoomID"] == null)
        {
            Response.Redirect("/Admin/ManageRoomSettings.aspx");
        }
        else
        {
            if (!IsPostBack)
            {
                GridThemes.DataBind();
            }
        }
    }

    protected void lnkAddTheme_Click(object sender, EventArgs e)
    {
        try
        {
            divThemeGrid.Visible = false;
            divThemeForm.Visible = true;
            lnkAddTheme.Visible = false;
            lnkBackToRooms.Visible = false;
            lnkBackToThemes.Visible = true;
            HfThemeID.Value = null;
            txtTheme.Text = String.Empty;
            drpThemeActive.SelectedIndex = 0;
            lblThemeMsg.Text = String.Empty;
        }
        catch (Exception eX) { }
    }

    protected void lnkBackToRooms_Click(object sender, EventArgs e)
    {
        Response.Redirect("/Admin/ManageRoomSettings.aspx");
    }

    protected void btnEdit_Click(object sender, EventArgs e)
    {
        try
        {
            divThemeGrid.Visible = false;
            divThemeForm.Visible = true;
            lnkAddTheme.Visible = false;
            lnkBackToRooms.Visible = false;
            lnkBackToThemes.Visible = true;
            txtTheme.Text = String.Empty;
            lblThemeMsg.Text = String.Empty;
            string ThemeID = ((LinkButton)sender).CommandArgument;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM Themes WHERE ThemeID = @ThemeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ThemeID", ThemeID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    HfThemeID.Value = ds.Tables[0].Rows[0]["ThemeID"].ToString().Trim();
                    txtTheme.Text = ds.Tables[0].Rows[0]["ThemeName"].ToString().Trim();
                    drpThemeActive.SelectedValue = ds.Tables[0].Rows[0]["IsActive"].ToString();
                }
            }
            else
            {
                lblThemeMsg.Text = "Error found, please try again!";
            }
        }
        catch (Exception ex) { }
    }

    protected void btnSaveTheme_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            if (HfThemeID.Value == null || HfThemeID.Value == "")
            {
                if (Session["RoomID"] != null)
                {
                    List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "INSERT INTO Themes (RoomID, ThemeName, IsActive) " +
                                             "VALUES (@RoomID, @ThemeName, @IsActive)";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("RoomID", Session["RoomID"].ToString()));
                        SqlParameters.Add(new SqlParameter("ThemeName", txtTheme.Text.ToString().Trim()));
                        SqlParameters.Add(new SqlParameter("IsActive", drpThemeActive.SelectedValue));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                    if (Tools.GetData(SQLCommands, out ds, out err))
                    {
                        lblThemeMsg.ForeColor = System.Drawing.Color.DarkGreen;
                        lblThemeMsg.Text = "Theme successfully inserted.";
                    }
                    else
                    {
                        lblThemeMsg.Text = "Error found, please try again!";
                    }
                }
                else
                {
                    btnCancelTheme_Click(sender, e);
                }
            }
            else
            {
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "UPDATE Themes SET ThemeName = @ThemeName, IsActive = @IsActive WHERE ThemeID = @ThemeID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ThemeID", HfThemeID.Value));
                    SqlParameters.Add(new SqlParameter("ThemeName", txtTheme.Text.ToString().Trim()));
                    SqlParameters.Add(new SqlParameter("IsActive", drpThemeActive.SelectedValue));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    lblThemeMsg.ForeColor = System.Drawing.Color.DarkGreen;
                    lblThemeMsg.Text = "Theme successfully updated.";
                }
                else
                {
                    lblThemeMsg.Text = "Error found, please try again!";
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void btnCancelTheme_Click(object sender, EventArgs e)
    {
        try
        {
            divThemeGrid.Visible = true;
            divThemeForm.Visible = false;
            lnkAddTheme.Visible = true;
            lnkBackToRooms.Visible = true;
            lnkBackToThemes.Visible = false;
            txtTheme.Text = String.Empty;
            drpThemeActive.SelectedIndex = 0;
            lblThemeMsg.Text = String.Empty;
        }
        catch (Exception eX) { }
    }

    protected void lnkBackToThemes_Click(object sender, EventArgs e)
    {
        try
        {
            divThemeGrid.Visible = true;
            divThemeForm.Visible = false;
            lnkAddTheme.Visible = true;
            lnkBackToRooms.Visible = true;
            lnkBackToThemes.Visible = false;
            divThemeImageGrid.Visible = false;
            divThemeImageForm.Visible = false;
            txtTheme.Text = String.Empty;
            drpThemeActive.SelectedIndex = 0;
            lblThemeMsg.Text = String.Empty;
        }
        catch (Exception eX) { }
    }

    protected void btnImgManagement_Click(object sender, EventArgs e)
    {
        try
        {
            string ThemeID = ((LinkButton)sender).CommandArgument;
            Session["ThemeID"] = ThemeID.ToString();
            divThemeGrid.Visible = false;
            divThemeForm.Visible = false;
            divThemeImageGrid.Visible = true;
            divThemeImageForm.Visible = false;
            lnkAddTheme.Visible = false;
            lnkBackToRooms.Visible = false;
            lnkBackToThemes.Visible = true;
            GridThemeImages.DataBind();
        }
        catch (Exception ex) { }
    }

    protected void btnImageSave_Click(object sender, EventArgs e)
    {
        try
        {
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            string HighResID = "";
            string ThumbnailID = "";
            string ListViewID = "";
            string LowResID = "";
            string ImageFileID = "";
            if (Session["File"] != null)
            {
                Dictionary<string, string> files = new Dictionary<string, string>();
                files = ((Dictionary<string, string>)Session["File"]);

                if (files.ContainsKey("ThemeImage"))
                {
                    String NewFilePath = String.Empty;
                    string filePath = files["ThemeImage"];
                    string BucketName = ConfigurationManager.AppSettings["S3BucketName"];
                    string FolderName = "project-hnm/Themes/";
                    ImageFileID = Tools.SaveImage(filePath, BucketName, FolderName, out ErrorIfAny);
                }
                Session.Remove("File");
            }
            if (HfThemeImageID.Value == null || HfThemeImageID.Value == "")
            {
                if (Session["ThemeID"] != null)
                {
                    string newImageID = String.Empty;

                    if (ImageFileID != "")
                    {
                        SQLCommands = new List<Tools.SqlContainer>();
                        {
                            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                            SQLContainer.Query = "INSERT INTO Images (ThemeID, [ThumbnailID], ListViewID, [FileID], [HighResID], ImageDescription) " +
                                                 "VALUES (@ThemeID, @ThumbnailID, @ListViewID, @FileID, @HighResID, @ImageDescription)";
                            List<SqlParameter> SqlParameters = new List<SqlParameter>();
                            SqlParameters.Add(new SqlParameter("ThemeID", Session["ThemeID"].ToString()));
                            SqlParameters.Add(new SqlParameter("ThumbnailID", ImageFileID));
                            SqlParameters.Add(new SqlParameter("ListViewID", ImageFileID));
                            SqlParameters.Add(new SqlParameter("FileID", ImageFileID));
                            SqlParameters.Add(new SqlParameter("HighResID", ImageFileID));
                            SqlParameters.Add(new SqlParameter("ImageDescription", txtImgDesc.Text.ToString().Trim()));
                            SQLContainer.SqlParameters = SqlParameters;
                            SQLCommands.Add(SQLContainer);
                        }
                        if (Tools.ExecuteSQL(SQLCommands, out ErrorIfAny))
                        {
                            if (chkDefault.Checked)
                            {
                                newImageID = getID("SELECT MAX(ImageID) AS ID FROM Images");
                                setDefault(newImageID, Session["ThemeID"].ToString());
                            }
                            newImageID = getID("SELECT MAX(ImageID) AS ID FROM Images");
                            HfThemeImageID.Value = newImageID;
                            divThemeGrid.Visible = false;
                            divThemeForm.Visible = false;
                            divThemeImageGrid.Visible = true;
                            divThemeImageForm.Visible = false;
                            lnkAddTheme.Visible = false;
                            lnkBackToRooms.Visible = false;
                            lnkBackToThemes.Visible = true;
                            GridThemeImages.DataBind();
                        }
                        else
                        {
                            lblThemeImgMsg.Text = "Error found";
                        }
                    }
                    else
                    {
                        lblThemeImgMsg.Text = "Please select the image to be uploaded";
                    }
                    hdnImageID.Value = newImageID;
                    GridImages.DataBind();
                }
            }
            else
            {
                SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    if (ImageFileID != "")
                    {
                        SQLContainer.Query = "UPDATE Images SET ImageDescription = @ImageDescription, HighResID = @HighResID, " +
                                             "FileID = @FileID, ThumbnailID = @ThumbnailID, ListViewID = @ListViewID " +
                                             "WHERE ImageID = @ImageID";
                    }
                    else
                    {
                        SQLContainer.Query = "UPDATE Images SET ImageDescription = @ImageDescription WHERE ImageID = @ImageID";
                    }
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ImageDescription", txtImgDesc.Text.ToString().Trim()));
                    if (ImageFileID != "")
                    {
                        SqlParameters.Add(new SqlParameter("HighResID", ImageFileID));
                        SqlParameters.Add(new SqlParameter("FileID", ImageFileID));
                        SqlParameters.Add(new SqlParameter("ThumbnailID", ImageFileID));
                        SqlParameters.Add(new SqlParameter("ListViewID", ImageFileID));
                    }
                    SqlParameters.Add(new SqlParameter("ImageID", HfThemeImageID.Value.ToString()));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.ExecuteSQL(SQLCommands, out ErrorIfAny))
                {
                    if (chkDefault.Checked)
                        setDefault(HfThemeImageID.Value.ToString(), Session["ThemeID"].ToString());
                    else
                        setDefault(HfThemeImageID.Value.ToString(), Session["ThemeID"].ToString());
                    divThemeGrid.Visible = false;
                    divThemeForm.Visible = false;
                    divThemeImageGrid.Visible = true;
                    divThemeImageForm.Visible = false;
                    lnkAddTheme.Visible = false;
                    lnkBackToRooms.Visible = false;
                    lnkBackToThemes.Visible = true;
                    GridThemeImages.DataBind();
                }
                else
                {
                    lblThemeImgMsg.Text = "Error found";
                }
                hdnImageID.Value = HfThemeImageID.Value.ToString();
                GridImages.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    string getID(string cmd)
    {
        string id = "";
        string err = "";
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = cmd;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            if (ds.Tables[0].Rows.Count > 0)
                id = ds.Tables[0].Rows[0][0].ToString().Trim();
        }
        return id;
    }

    void setDefault(string id, string ThemeID)
    {
        try
        {
            if (chkDefault.Checked)
            {
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                {
                    SQLContainer.Query = "Update Images SET IsDefault = 1 WHERE ImageID = @ImageID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ImageID", id));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                {
                    SQLContainer.Query = "Update Images SET IsDefault = 0 WHERE ThemeID = @ThemeID AND ImageID NOT IN (@ImageID)";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ThemeID", ThemeID));
                    SqlParameters.Add(new SqlParameter("ImageID", id));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                Tools.ExecuteSQL(SQLCommands, out ErrorIfAny);
            }
            else
            {
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "Update Images SET IsDefault = 0 WHERE ImageID = @ImageID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ImageID", id));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                Tools.ExecuteSQL(SQLCommands, out ErrorIfAny);
            }
        }
        catch (Exception ex) { }
    }

    protected void btnImageCancel_Click(object sender, EventArgs e)
    {
        try
        {
            divThemeImageGrid.Visible = true;
            divThemeImageForm.Visible = false;
            lblThemeImgMsg.Text = String.Empty;
        }
        catch (Exception ex) { }
    }

    protected void GridThemeImages_FocusedRowChanged(object sender, EventArgs e)
    {
        try
        {
            UpdateID();
        }
        catch (Exception eX) { }
    }

    protected void btnAddImage_Click(object sender, EventArgs e)
    {
        try
        {
            divThemeImageGrid.Visible = false;
            divThemeImageForm.Visible = true;
            lblThemeImgMsg.Text = String.Empty;
            HfThemeImageID.Value = null;
            hdnImageID.Value = null;
            txtImgDesc.Text = String.Empty;
            chkDefault.Checked = false;
        }
        catch (Exception ex) { }
    }

    protected void btnUpdateImage_Click(object sender, EventArgs e)
    {
        try
        {
            if (GridThemeImages.FocusedRowIndex != -1)
            {
                string id = String.Empty;
                id = GridThemeImages.GetRowValues(GridThemeImages.FocusedRowIndex, "ImageID").ToString().Trim();
                HfThemeImageID.Value = id.ToString();
                divThemeImageGrid.Visible = false;
                divThemeImageForm.Visible = true;
                lblThemeImgMsg.Text = String.Empty;
                GetThemeImageDetails(HfThemeImageID.Value.ToString());
                hdnImageID.Value = HfThemeImageID.Value.ToString();
                GridImages.DataBind();
            }
            else
            {
                PopUpImageUpdateMsg.ShowOnPageLoad = true;
            }
        }
        catch (Exception ex) { }
    }

    void GetThemeImageDetails(string ImgID)
    {
        try
        {
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "[GetImageDetailsByID] @ImageID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ImageID", ImgID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            ds = new DataSet("ds");
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    txtImgDesc.Text = ds.Tables[0].Rows[0]["ImageDescription"].ToString().Trim();
                    try
                    {
                        chkDefault.Checked = Convert.ToBoolean(ds.Tables[0].Rows[0]["IsDefault"].ToString().Trim());
                    }
                    catch (Exception) { }
                }
            }
        }
        catch (Exception ex) { }
    }

    void UpdateID()
    {
        if (GridThemeImages.FocusedRowIndex != -1)
        {
            string id = String.Empty;
            id = GridThemeImages.GetRowValues(GridThemeImages.FocusedRowIndex, "ImageID").ToString().Trim();
            HfThemeImageID.Value = id.ToString();
        }
    }

    protected void btnDeleteImage_Click(object sender, EventArgs e)
    {
        if (GridThemeImages.FocusedRowIndex != -1)
        {
            string id = String.Empty;
            id = GridThemeImages.GetRowValues(GridThemeImages.FocusedRowIndex, "ImageID").ToString().Trim();
            HfThemeImageID.Value = id.ToString();
            PopUpDeleteConfirmMsg.ShowOnPageLoad = true;
        }
        else
        {
            PopUpImageDeleteMsg.ShowOnPageLoad = true;
        }
    }

    protected void btnDeleteYes_Click(object sender, EventArgs e)
    {
        try
        {
            if (HfThemeImageID.Value != "" && HfThemeImageID.Value != null)
            {
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "Delete FROM Images WHERE ImageID = @ImageID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ImageID", HfThemeImageID.Value.ToString()));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.ExecuteSQL(SQLCommands, out ErrorIfAny))
                {
                }
                GridThemeImages.DataBind();
                PopUpDeleteConfirmMsg.ShowOnPageLoad = false;
            }
        }
        catch (Exception ex) { }
    }

    protected void btnDeleteNo_Click(object sender, EventArgs e)
    {
        PopUpDeleteConfirmMsg.ShowOnPageLoad = false;
    }

    protected void btnConfigure_Click(object sender, EventArgs e)
    {
        try
        {
            string ThemeID = ((LinkButton)sender).CommandArgument;
            Session["ThemeID"] = ThemeID.ToString();
            Response.Redirect("/Admin/ConfigureRoomTheme.aspx");
        }
        catch (Exception ex) { }
    }

    protected void btnDefaultSettings_Click(object sender, EventArgs e)
    {
        try
        {
            string ThemeID = ((LinkButton)sender).CommandArgument;
            Session["ThemeID"] = ThemeID.ToString();
            Response.Redirect("/Admin/ThemeDefaultSettings.aspx");
        }
        catch (Exception ex) { }
    }

    protected void btnProperties_Click(object sender, EventArgs e)
    {
        try
        {
            string ThemeID = ((LinkButton)sender).CommandArgument;
            Session["ThemeID"] = ThemeID.ToString();
            Response.Redirect("/Admin/ManageThemeProperties.aspx");
        }
        catch (Exception ex) { }
    }
}