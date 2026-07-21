using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;

public partial class PropertyDetails : System.Web.UI.Page
{
    string ProjectID = String.Empty;
    string ErrorIfAny = String.Empty;
    string UserID = String.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            if (Session["UserID"] != null && Session["UserID"] != "")
            {
                UserID = Session["UserID"].ToString();
            }
            else
            {
                Response.Redirect("/Home.aspx");
            }
            if (Session["ProjectID"] != null)
            {
                ProjectID = Session["ProjectID"].ToString();
            }
            if (!IsPostBack)
            {
                GetProjectDetails(ProjectID);
                GetProjectGalleryImages(ProjectID);
            }
            if (!IsPostBack)
            {
                imgPreview.Attributes.Add("src", ConfigurationManager.AppSettings["SiteUrl"] + "assets/images/dummy-preview.jpg");
            }
        }
        catch (Exception ex) { }
    }

    void GetProjectDetails(string ProjectID)
    {
        try
        {
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectDetails @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    lblPropertyType.Text = ds.Tables[0].Rows[0]["PropertyType"].ToString();
                    lblFlatType.Text = ds.Tables[0].Rows[0]["ProjectFlatType"].ToString();

                    if (ds.Tables[0].Rows[0]["FloorPlanPath"].ToString() != "")
                    {
                        DivFloorPlanForm.Attributes.Add("class", "hnm-my-project__doc-box");
                        lblFloorPlanForm.Text = "Colour floor plan";
                        ImgFloorPlanForm.ImageUrl = "~/assets/images/tick-icon.svg";
                        DivDwldFloorPlan.Visible = true;
                        lblFloorPlanFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["FloorPlanPath"].ToString());
                        lnkDwnldFloorPlan.CommandArgument = ds.Tables[0].Rows[0]["FloorPlanPath"].ToString();
                    }
                    else
                    {
                        DivFloorPlanForm.Attributes.Add("class", "hnm-my-project__doc-box hnm-my-project__doc-box--red");
                        lblFloorPlanForm.Text = "Floor plan pending";
                        ImgFloorPlanForm.ImageUrl = "~/assets/images/pending-icon.svg";
                        DivDwldFloorPlan.Visible = false;
                        lblFloorPlanFile.Text = String.Empty;
                        lnkDwnldFloorPlan.CommandArgument = "";
                    }
                    if (ds.Tables[0].Rows[0]["PermitPath"].ToString() != "")
                    {
                        DivPermitForm.Attributes.Add("class", "hnm-my-project__doc-box");
                        lblPermitForm.Text = "Permit form";
                        ImgPermitForm.ImageUrl = "~/assets/images/tick-icon.svg";
                        DivDwldPermit.Visible = true;
                        lblRenovationPermitFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["PermitPath"].ToString());
                        lnkDwnldPermit.CommandArgument = ds.Tables[0].Rows[0]["PermitPath"].ToString();
                    }
                    else
                    {
                        DivPermitForm.Attributes.Add("class", "hnm-my-project__doc-box hnm-my-project__doc-box--red");
                        lblPermitForm.Text = "Permit form pending";
                        ImgPermitForm.ImageUrl = "~/assets/images/pending-icon.svg";
                        DivDwldPermit.Visible = false;
                        lblRenovationPermitFile.Text = String.Empty;
                        lnkDwnldPermit.CommandArgument = "";
                    }
                    if (ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString() != "")
                    {
                        DivIndemnityForm.Attributes.Add("class", "hnm-my-project__doc-box");
                        lblIndemnityForm.Text = "Indemnity form";
                        ImgIndemnityForm.ImageUrl = "~/assets/images/tick-icon.svg";
                        DivDwldIndemnity.Visible = true;
                        lblIndemnityFile.Text = Path.GetFileName(ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString());
                        lnkDwnldIndemnity.CommandArgument = ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString();
                    }
                    else
                    {
                        DivIndemnityForm.Attributes.Add("class", "hnm-my-project__doc-box hnm-my-project__doc-box--red");
                        lblIndemnityForm.Text = "Indemnity pending";
                        ImgIndemnityForm.ImageUrl = "~/assets/images/pending-icon.svg";
                        DivDwldIndemnity.Visible = false;
                        lblIndemnityFile.Text = String.Empty;
                        lnkDwnldIndemnity.CommandArgument = "";
                    }
                    Session["FloorPlanPath"] = ds.Tables[0].Rows[0]["FloorPlanPath"].ToString();
                    Session["PermitPath"] = ds.Tables[0].Rows[0]["PermitPath"].ToString();
                    Session["IndemnityFormPath"] = ds.Tables[0].Rows[0]["IndemnityFormPath"].ToString();
                    Session["IsFloorPlanUploaded"] = ds.Tables[0].Rows[0]["IsFloorPlanUploaded"].ToString();
                    Session["IsPermitUploaded"] = ds.Tables[0].Rows[0]["IsPermitUploaded"].ToString();
                    Session["IsIndemnityFormUploaded"] = ds.Tables[0].Rows[0]["IsIndemnityFormUploaded"].ToString();
                }
            }
        }
        catch (Exception ex) { }
    }

    void GetProjectGalleryImages(string ProjectID)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectGalleryImages @ProjectID";
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
                rptProjectGallery.DataSource = DS;
                rptProjectGallery.DataBind();
                for (int i = 0; i <= DS.Tables[0].Rows.Count - 1; i++)
                {
                    StringBuilder sbImageSlider = new StringBuilder();
                    if (DS.Tables[0].Rows.Count > 0)
                    {
                        sbImageSlider.Append("<div class='modal fade hnm-img-slider' id='imgSlider" + Convert.ToString(DS.Tables[0].Rows[i]["ProjectGalleryID"]) + "'"
                                                 + " tabindex='-1' aria-labelledby='imgSliderLabel' aria-hidden='true' >"
                                                 + "<div class='modal-dialog modal-dialog-centered'>"
                                                 + "<div class='modal-content'>"
                                                 + "<div class='modal-body'>"
                                                 + "<button type='button' class='close' data-dismiss='modal' aria-label='Close'>"
                                                 + "<img src='../assets/images/close-icon-grey-round.svg' alt='X' class='hnm-img-slider__close-icon'>"
                                                 + "</button><div class='hnm-img-slider__for'>"
                                                 + "<div class='hnm-img-slider__for-item' style='background-image:url(" + Convert.ToString(DS.Tables[0].Rows[i]["ImagePath"]) + ");'>"
                                                 + "</div></div><div class='hnm-img-slider__nav'></div></div></div></div></div>");
                        litGalleryImagePopUp.Text = litGalleryImagePopUp.Text + sbImageSlider.ToString();
                    }
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void lnkUploadDocuments_Click(object sender, EventArgs e)
    {
        try
        {
            lblMessage.Visible = false;
            uploadPendingModal.Style.Add("padding-right", "17px");
            uploadPendingModal.Style.Add("display", "block");
            uploadPendingModal.Attributes.Add("class", "modal fade hnm-modal hnm-modal--upload-docs show");
            HtmlGenericControl body = (HtmlGenericControl)Master.FindControl("MasterBody");
            body.Attributes.Add("class", "modal-open");
            body.Style.Add("padding-right", "17px");
            ((Literal)Master.FindControl("LitDivPopUp")).Text = "<div class='modal-backdrop fade show'></div>";
        }
        catch (Exception ex) { }
    }

    protected void lnkClosePopUp_Click(object sender, EventArgs e)
    {
        try
        {
            uploadPendingModal.Style.Remove("padding-right");
            uploadPendingModal.Style.Remove("display");
            uploadPendingModal.Attributes.Add("class", "modal fade hnm-modal hnm-modal--upload-docs");
            HtmlGenericControl body = (HtmlGenericControl)Master.FindControl("MasterBody");
            body.Attributes.Remove("class");
            body.Style.Remove("padding-right");
            ((Literal)Master.FindControl("LitDivPopUp")).Text = "";
        }
        catch (Exception ex) { }
    }

    protected void btnCancelFiles_Click(object sender, EventArgs e)
    {
        try
        {
            lblMessage.Visible = false;
            lblMessage.Text = "";
            uploadPendingModal.Style.Remove("padding-right");
            uploadPendingModal.Style.Remove("display");
            uploadPendingModal.Attributes.Add("class", "modal fade hnm-modal hnm-modal--upload-docs");
            HtmlGenericControl body = (HtmlGenericControl)Master.FindControl("MasterBody");
            body.Attributes.Remove("class");
            body.Style.Remove("padding-right");
            ((Literal)Master.FindControl("LitDivPopUp")).Text = "";
        }
        catch (Exception ex) { }
    }

    protected void btnSaveFiles_Click(object sender, EventArgs e)
    {
        try
        {
            string FloorPlanPath = String.Empty;
            string RenovationPermitPath = String.Empty;
            string IndemnityPath = String.Empty;
            int IsFloorPlanUploaded = 0;
            int IsRenovationPermitUploaded = 0;
            int IsIndemnityUploaded = 0;
            string OriginalFileName = String.Empty;
            string[] ExtensionArray = new string[0];
            int IsAllowedFormatFloorPlan = 1;
            int IsAllowedFormatRenovationPermit = 1;
            int IsAllowedFormatIndemnityFileUpload = 1;
            if (FloorPlanUpload.HasFile)
            {
                FileInfo FileName = new FileInfo(FloorPlanUpload.PostedFile.FileName);
                OriginalFileName = FileName.ToString();
                ExtensionArray = OriginalFileName.Split('.');
                string FileExtension = ExtensionArray[1].ToString();
                if (FileExtension == "png" || FileExtension == "jpg" || FileExtension == "jpeg" || FileExtension == "pdf")
                {
                    IsAllowedFormatFloorPlan = 1;
                }
                else
                {
                    IsAllowedFormatFloorPlan = 0;
                }
                OriginalFileName = ExtensionArray[0] + "_" + DateTime.Now.ToString("yyyyMMddHHmmss") + "." + ExtensionArray[ExtensionArray.Length - 1];
                FloorPlanUpload.SaveAs(Server.MapPath("/UploadedFiles/FloorPlan/") + OriginalFileName);
                FloorPlanPath = ConfigurationManager.AppSettings["BaseUrl"] + "FloorPlan/" + OriginalFileName;
                Session["FloorPlanPath"] = FloorPlanPath;
                IsFloorPlanUploaded = 1;
                Session["IsFloorPlanUploaded"] = IsFloorPlanUploaded;
            }
            if (RenovationPermitUpload.HasFile)
            {
                FileInfo FileName = new FileInfo(RenovationPermitUpload.PostedFile.FileName);
                OriginalFileName = FileName.ToString();
                ExtensionArray = OriginalFileName.Split('.');
                string FileExtension = ExtensionArray[1].ToString();
                if (FileExtension == "png" || FileExtension == "jpg" || FileExtension == "jpeg" || FileExtension == "pdf")
                {
                    IsAllowedFormatRenovationPermit = 1;
                }
                else
                {
                    IsAllowedFormatRenovationPermit = 0;
                }
                OriginalFileName = ExtensionArray[0] + "_" + DateTime.Now.ToString("yyyyMMddHHmmss") + "." + ExtensionArray[ExtensionArray.Length - 1];
                RenovationPermitUpload.SaveAs(Server.MapPath("/UploadedFiles/RenovationPermit/") + OriginalFileName);
                RenovationPermitPath = ConfigurationManager.AppSettings["BaseUrl"] + "RenovationPermit/" + OriginalFileName;
                Session["PermitPath"] = RenovationPermitPath;
                IsRenovationPermitUploaded = 1;
                Session["IsPermitUploaded"] = IsRenovationPermitUploaded;
            }
            if (IndemnityFileUpload.HasFile)
            {
                FileInfo FileName = new FileInfo(IndemnityFileUpload.PostedFile.FileName);
                OriginalFileName = FileName.ToString();
                ExtensionArray = OriginalFileName.Split('.');
                string FileExtension = ExtensionArray[1].ToString();
                if (FileExtension == "png" || FileExtension == "jpg" || FileExtension == "jpeg" || FileExtension == "pdf")
                {
                    IsAllowedFormatIndemnityFileUpload = 1;
                }
                else
                {
                    IsAllowedFormatIndemnityFileUpload = 0;
                }
                OriginalFileName = ExtensionArray[0] + "_" + DateTime.Now.ToString("yyyyMMddHHmmss") + "." + ExtensionArray[ExtensionArray.Length - 1];
                IndemnityFileUpload.SaveAs(Server.MapPath("/UploadedFiles/Indemnity/") + OriginalFileName);
                IndemnityPath = ConfigurationManager.AppSettings["BaseUrl"] + "Indemnity/" + OriginalFileName;
                Session["IndemnityFormPath"] = IndemnityPath;
                IsIndemnityUploaded = 1;
                Session["IsIndemnityFormUploaded"] = IsIndemnityUploaded;
            }
            if (IsAllowedFormatFloorPlan == 0 || IsAllowedFormatIndemnityFileUpload == 0 || IsAllowedFormatRenovationPermit == 0)
            {
                lblMessage.Visible = true;
                lblMessage.Text = "Selected files are in other formats. Only PDF, JPG or PNG Formats are allowed.";
            }
            else
            {
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "SaveUploadDocumentsForProject @ProjectID, @IsFloorPlanUploaded, @IsRenovationPermitUploaded, @IsIndemnityUploaded," +
                                         "@FloorPlanPath, @RenovationPermitPath, @IndemnityFormPath";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                    SqlParameters.Add(new SqlParameter("IsFloorPlanUploaded", Session["IsFloorPlanUploaded"]));
                    SqlParameters.Add(new SqlParameter("IsRenovationPermitUploaded", Session["IsPermitUploaded"]));
                    SqlParameters.Add(new SqlParameter("IsIndemnityUploaded", Session["IsIndemnityFormUploaded"]));
                    SqlParameters.Add(new SqlParameter("FloorPlanPath", Session["FloorPlanPath"]));
                    SqlParameters.Add(new SqlParameter("RenovationPermitPath", Session["PermitPath"]));
                    SqlParameters.Add(new SqlParameter("IndemnityFormPath", Session["IndemnityFormPath"]));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                {
                    GetProjectDetails(ProjectID);
                    lnkClosePopUp_Click(sender, e);
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void lnkDwnldFloorPlan_Click(object sender, EventArgs e)
    {
        try
        {
            String file = ((LinkButton)sender).CommandArgument;
            string actualFilePath = file;
            Response.ContentType = "application/pdf";
            string filename = Path.GetFileName(actualFilePath);
            String Header = "Attachment; Filename=" + filename;
            Response.AppendHeader("Content-Disposition", Header);
            actualFilePath = Server.MapPath("/UploadedFiles/FloorPlan/" + filename);
            Response.TransmitFile(actualFilePath);
            Response.End();
        }
        catch (Exception ex) { }
    }

    protected void lnkDwnldPermit_Click(object sender, EventArgs e)
    {
        try
        {
            String file = ((LinkButton)sender).CommandArgument;
            string actualFilePath = file;
            Response.ContentType = "application/pdf";
            string filename = Path.GetFileName(actualFilePath);
            String Header = "Attachment; Filename=" + filename;
            Response.AppendHeader("Content-Disposition", Header);
            actualFilePath = Server.MapPath("/UploadedFiles/RenovationPermit/" + filename);
            Response.TransmitFile(actualFilePath);
            Response.End();
        }
        catch (Exception ex) { }
    }

    protected void lnkDwnldIndemnity_Click(object sender, EventArgs e)
    {
        try
        {
            String file = ((LinkButton)sender).CommandArgument;
            string actualFilePath = file;
            Response.ContentType = "application/pdf";
            string filename = Path.GetFileName(actualFilePath);
            String Header = "Attachment; Filename=" + filename;
            Response.AppendHeader("Content-Disposition", Header);
            actualFilePath = Server.MapPath("/UploadedFiles/Indemnity/" + filename);
            Response.TransmitFile(actualFilePath);
            Response.End();
        }
        catch (Exception ex) { }
    }

    protected void lnkSaveGalleryImages_Click(object sender, EventArgs e)
    {
        try
        {
            string ImagePath = String.Empty;
            string OriginalFileName = String.Empty;
            string[] ExtensionArray = new string[0];

            if (GalleryImageUpload.HasFile)
            {
                FileInfo FileName = new FileInfo(GalleryImageUpload.PostedFile.FileName);
                OriginalFileName = FileName.ToString();
                ExtensionArray = OriginalFileName.Split('.');
                string FileExtension = ExtensionArray[1].ToString();
                if (FileExtension.ToString() == "jpg" || FileExtension.ToString() == "png")
                {
                    OriginalFileName = ExtensionArray[0] + "_" + DateTime.Now.ToString("yyyyMMddHHmmss") + "." + ExtensionArray[ExtensionArray.Length - 1];
                    GalleryImageUpload.SaveAs(Server.MapPath("/UploadedFiles/ProjectGallery/") + OriginalFileName);
                    ImagePath = ConfigurationManager.AppSettings["BaseUrl"] + "ProjectGallery/" + OriginalFileName;
                }
                if (ImagePath != "")
                {
                    DataSet ds = new DataSet("ds");
                    List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SaveGalleryImagesForProject @ProjectID, @ImagePath";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                        SqlParameters.Add(new SqlParameter("ImagePath", ImagePath));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                    if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                    {
                        GetProjectGalleryImages(ProjectID);
                        imgPreview.Attributes.Add("src", ConfigurationManager.AppSettings["SiteUrl"] + "assets/images/dummy-preview.jpg");
                    }
                }
                else
                {
                    lblPopUpMessage.Text = "Only JPG or PNG formats are permitted. Please select files in the correct format.";
                    ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "openInvalidMessageModal();", true);
                }
            }
            else
            {
                lblPopUpMessage.Text = "Please choose a file.";
                ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "openInvalidMessageModal();", true);
            }

        }
        catch (Exception ex) { }
    }

    protected void btnValidPopUpClose_Click(object sender, EventArgs e)
    {
        try
        {
            ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "CloseInvalidModal();", true);
        }
        catch (Exception eX) { }
    }
}