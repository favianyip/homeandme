using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using Amazon.S3;
using Amazon.S3.Model;
using System.Configuration;

public partial class Admin_ManageRoomSettings : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session[Tools.SessionVariables.AdminUserID] == null)
        {
            Response.Redirect("/Admin.aspx");
        }
        else
        {
            if (!IsPostBack)
            {
                GridRooms.DataBind();
            }
        }
    }

    protected void btnNew_Click(object sender, EventArgs e)
    {
        try
        {
            Session["ImageFileName"] = null;
            Session["ActiveImageFileName"] = null;
            divRoomsGrid.Visible = false;
            divRoomForm.Visible = true;
            btnNew.Visible = false;
            HfRoomID.Value = null;
            TxtRooms.Text = "";
            OptionImages.ImageUrl = "";
            ActiveImage.ImageUrl = "";
        }
        catch (Exception ex) { }
    }

    protected void btnEdit_Click(object sender, EventArgs e)
    {
        try
        {
            divRoomsGrid.Visible = false;
            divRoomForm.Visible = true;
            btnNew.Visible = false;
            TxtRooms.Text = string.Empty;
            string id = ((LinkButton)sender).CommandArgument;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT RoomID, RoomName, ImageURL, ImageURL2,IsActive, IsInitialLoad FROM Rooms WHERE RoomID = @RoomID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("RoomID", id));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    HfRoomID.Value = ds.Tables[0].Rows[0]["RoomID"].ToString().Trim();
                    TxtRooms.Text = ds.Tables[0].Rows[0]["RoomName"].ToString().Trim();
                    ddlRoomInitialLoad.SelectedValue = Convert.ToString(ds.Tables[0].Rows[0]["IsInitialLoad"]);
                    ddlRoomActive.SelectedValue = Convert.ToString(ds.Tables[0].Rows[0]["IsActive"]);
                    if (ds.Tables[0].Rows[0]["ImageURL"].ToString().Length > 0)
                    {
                        OptionImages.ImageUrl = ds.Tables[0].Rows[0]["ImageURL"].ToString();
                        OptionImages.Visible = true;
                    }
                    else
                    {
                        OptionImages.Visible = false;
                    }
                    if (ds.Tables[0].Rows[0]["ImageURL2"].ToString().Length > 0)
                    {
                        ActiveImage.ImageUrl = ds.Tables[0].Rows[0]["ImageURL2"].ToString();
                        ActiveImage.Visible = true;
                    }
                    else
                    {
                        ActiveImage.Visible = false;
                    }
                }
            }
            else
            {
                lblSubCategoryMsg.Text = "Error found, please try again ";
            }
        }
        catch (Exception ex) { }
    }

    protected void BtnCancel_Click(object sender, EventArgs e)
    {
        try
        {
            divRoomsGrid.Visible = true;
            divRoomForm.Visible = false;
            btnNew.Visible = true;
            TxtRooms.Text = string.Empty;
            lblSubCategoryMsg.Text = "";
            ddlRoomActive.SelectedValue = "0";
            ddlRoomInitialLoad.SelectedValue = "0";
        }
        catch (Exception eX) { }
    }

    void reloadpage()
    {
        Session["ImageFileName"] = null;
        Session["ActiveImageFileName"] = null;
        divRoomsGrid.Visible = true;
        divRoomForm.Visible = false;
        btnNew.Visible = true;
        TxtRooms.Text = string.Empty;
        lblSubCategoryMsg.Text = "";
        lblActiveImageMsg.Text = "";
        ddlRoomActive.SelectedValue = "0";
        ddlRoomInitialLoad.SelectedValue = "0";
    }

    protected void btnSave_Click(object sender, EventArgs e)
    {
        if (Page.IsValid)
        {
            string ImageFileName = string.Empty;
            string ActiveImageFileName = string.Empty;
            int IsHave1stImage = 0, IsHave2ndImage = 0;
            if (HfRoomID.Value == null || HfRoomID.Value == "")
            {
                if (Session["ImageFileName"] == null)
                {
                    lblSubCategoryMsg.Text = "Please provide Image.";
                }
                else
                {
                    IsHave1stImage = 1;
                    ImageFileName = Session["ImageFileName"].ToString();
                    OptionImages.ImageUrl = Session["ImageFileName"].ToString();
                }
                if (Session["ActiveImageFileName"] == null)
                {
                    lblActiveImageMsg.Text = "Please provide active image.";
                }
                else
                {
                    IsHave2ndImage = 1;
                    ActiveImageFileName = Session["ActiveImageFileName"].ToString();
                    ActiveImage.ImageUrl = Session["ActiveImageFileName"].ToString();
                }
            }
            else
            {
                if (Session["ImageFileName"] != null)
                {
                    IsHave1stImage = 1;
                    ImageFileName = Session["ImageFileName"].ToString();
                }
                else
                {
                    IsHave1stImage = 1;
                    ImageFileName = OptionImages.ImageUrl;
                }
                if (ImageFileName == "")
                {
                    IsHave1stImage = 0;
                    lblSubCategoryMsg.Text = "Please provide  Image.";
                }

                if (Session["ActiveImageFileName"] != null)
                {
                    IsHave2ndImage = 1;
                    ActiveImageFileName = Session["ActiveImageFileName"].ToString();
                }
                else
                {
                    IsHave2ndImage = 1;
                    ActiveImageFileName = ActiveImage.ImageUrl;
                }
                if (ActiveImageFileName == "")
                {
                    IsHave2ndImage = 0;
                    lblActiveImageMsg.Text = "Please provide active Image.";
                    return;
                }
            }

            if (HfRoomID.Value == null || HfRoomID.Value == "")
            {
                #region Create Options
                if (IsHave1stImage == 1 && IsHave2ndImage == 1)
                {
                    string err = "";
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                    SQLContainer.Query = "InsertRooms @RoomName, @ImageURL, @ActiveImageURL, @IsInitialLoad, @IsActive";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("RoomName", TxtRooms.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("ImageURL", ImageFileName));
                    SqlParameters.Add(new SqlParameter("ActiveImageURL", ActiveImageFileName));
                    SqlParameters.Add(new SqlParameter("IsInitialLoad", ddlRoomInitialLoad.SelectedValue));
                    SqlParameters.Add(new SqlParameter("IsActive", ddlRoomActive.SelectedValue));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);

                    if (Tools.ExecuteSQL(SQLCommands, out err))
                    {
                        GridRooms.DataBind();
                        Session.Remove("ImageFileName");
                        reloadpage();
                    }
                    else
                    {
                        lblSubCategoryMsg.Text = "Error found, please try again ";
                    }
                }
                #endregion Create Options
            }
            else
            {
                #region update Options

                if (IsHave2ndImage == 1 && IsHave1stImage == 1)
                {
                    string err = "";
                    Tools.SqlContainer SQLContainer1 = new Tools.SqlContainer();
                    List<Tools.SqlContainer> SQLCommands1 = new List<Tools.SqlContainer>();
                    SQLContainer1.Query = "UPDATE Rooms SET RoomName = @RoomName, ImageURL = @ImageURL, ImageURL2 = @ImageURL2, " +
                                                "IsInitialLoad = @IsInitialLoad, IsActive = @IsActive  WHERE RoomID = @RoomID";
                    List<SqlParameter> SqlParameters1 = new List<SqlParameter>();
                    SqlParameters1.Add(new SqlParameter("RoomName", TxtRooms.Text.Trim()));
                    SqlParameters1.Add(new SqlParameter("ImageURL", ImageFileName));
                    SqlParameters1.Add(new SqlParameter("ImageURL2", ActiveImageFileName));
                    SqlParameters1.Add(new SqlParameter("IsInitialLoad", ddlRoomInitialLoad.SelectedValue));
                    SqlParameters1.Add(new SqlParameter("IsActive", ddlRoomActive.SelectedValue));
                    SqlParameters1.Add(new SqlParameter("RoomID", HfRoomID.Value));
                    SQLContainer1.SqlParameters = SqlParameters1;
                    SQLCommands1.Add(SQLContainer1);

                    if (Tools.ExecuteSQL(SQLCommands1, out err))
                    {
                        GridRooms.DataBind();
                        Session.Remove("ImageFileName");
                        reloadpage();
                    }
                }
                #endregion Update options
            }
        }
    }

    protected void btnGoBack_Click(object sender, EventArgs e)
    {
        divRoomsGrid.Visible = true;
        divRoomForm.Visible = false;
        btnNew.Visible = true;
        lblSubCategoryMsg.Text = "";
    }

    protected void btnTheme_Click(object sender, EventArgs e)
    {
        try
        {
            string RoomID = ((LinkButton)sender).CommandArgument;
            Session["RoomID"] = RoomID.ToString();
            Response.Redirect("/Admin/ManageThemeSettings.aspx");
        }
        catch (Exception ex) { }
    }

    protected void btnRoomConfigure_Click(object sender, EventArgs e)
    {
        try
        {
            string RoomId = ((LinkButton)sender).CommandArgument;
            Session["RoomID"] = RoomId.ToString();
            Response.Redirect("/Admin/ConfigureRoom.aspx");
        }
        catch (Exception ex) { }
    }

    protected void ASPxCallbackPanelRoom_Callback(object sender, DevExpress.Web.CallbackEventArgsBase e)
    {
        if (Session["ImageFileName"] != null)
        {
            OptionImages.Visible = true;
            OptionImages.ImageUrl = Session["ImageFileName"].ToString();
        }
    }

    protected void FileOptionImage_FileUploadComplete(object sender, DevExpress.Web.FileUploadCompleteEventArgs e)
    {
        try
        {
            System.Threading.Thread.Sleep(2000);
            string OriginalFileName = e.UploadedFile.FileName;
            string[] ExtensionArray = OriginalFileName.Split('.');
            if (ExtensionArray[1] == "png" || ExtensionArray[1] == "jpg" || ExtensionArray[1] == "jpeg")
            {
                string GuidFileName = ExtensionArray[0] + "_" + DateTime.Now.ToLocalTime().ToString("yyyyMMddHHmmss") + "." + ExtensionArray[ExtensionArray.Length - 1];
                string ServerPath = Server.MapPath("/Admin/UploadedFiles/") + @"\" + GuidFileName;
                e.UploadedFile.SaveAs(ServerPath, false);
                OriginalFileName = "Rooms/OptionImages/" + OriginalFileName;
                string ImageFileName = ConfigurationManager.AppSettings["S3Path"] + OriginalFileName;
                Session["ImageFileName"] = ImageFileName;
                OptionImages.Visible = true;
                OptionImages.ImageUrl = ImageFileName;
                IAmazonS3 client;
                using (client = new AmazonS3Client(ConfigurationManager.AppSettings["S3AccessKeyID"], ConfigurationManager.AppSettings["S3SecretAccessKey"], Amazon.RegionEndpoint.APSoutheast1))
                {
                    PutObjectRequest request = new PutObjectRequest()
                    {
                        BucketName = ConfigurationManager.AppSettings["S3BucketName"],
                        Key = "project-hnm/" + OriginalFileName,
                        FilePath = ServerPath,
                        CannedACL = Amazon.S3.S3CannedACL.PublicRead
                    };
                    PutObjectResponse response2 = client.PutObject(request);
                }
            }
        }
        catch { }
    }

    protected void panelRoomActiveImage_Callback(object sender, DevExpress.Web.CallbackEventArgsBase e)
    {
        if (Session["ActiveImageFileName"] != null)
        {
            ActiveImage.Visible = true;
            ActiveImage.ImageUrl = Session["ActiveImageFileName"].ToString();
        }
    }

    protected void FileActiveImage_FileUploadComplete(object sender, DevExpress.Web.FileUploadCompleteEventArgs e)
    {
        try
        {
            System.Threading.Thread.Sleep(2000);
            string OriginalFileName = e.UploadedFile.FileName;
            string[] ExtensionArray = OriginalFileName.Split('.');
            if (ExtensionArray[1] == "png" || ExtensionArray[1] == "jpg" || ExtensionArray[1] == "jpeg")
            {
                string GuidFileName = ExtensionArray[0] + "_" + DateTime.Now.ToLocalTime().ToString("yyyyMMddHHmmss") + "." + ExtensionArray[ExtensionArray.Length - 1];
                string ServerPath = Server.MapPath("/Admin/UploadedFiles/") + @"\" + GuidFileName;
                e.UploadedFile.SaveAs(ServerPath, false);
                OriginalFileName = "Rooms/OptionImages/" + OriginalFileName;
                string ImageFileName = ConfigurationManager.AppSettings["S3Path"] + OriginalFileName;
                Session["ActiveImageFileName"] = ImageFileName;
                ActiveImage.Visible = true;
                ActiveImage.ImageUrl = ImageFileName;
                IAmazonS3 client;
                using (client = new AmazonS3Client(ConfigurationManager.AppSettings["S3AccessKeyID"], ConfigurationManager.AppSettings["S3SecretAccessKey"], Amazon.RegionEndpoint.APSoutheast1))
                {
                    PutObjectRequest request = new PutObjectRequest()
                    {
                        BucketName = ConfigurationManager.AppSettings["S3BucketName"],
                        Key = "project-hnm/" + OriginalFileName,
                        FilePath = ServerPath,
                        CannedACL = Amazon.S3.S3CannedACL.PublicRead
                    };
                    PutObjectResponse response2 = client.PutObject(request);
                }
            }
        }
        catch (Exception eX) { }
    }
}