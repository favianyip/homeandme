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
using System.Web.UI.WebControls;

public partial class PaymentDetails : System.Web.UI.Page
{
    string ProjectID = String.Empty;
    string UserID = String.Empty;
    string ImagePath = String.Empty;
    protected void Page_Load(object sender, EventArgs e)
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
        GridPayments.DataBind();
        GetProjectCostDetails(ProjectID);
        GetProjectPaymentImages(ProjectID);
        if (!IsPostBack)
        {
            imgPreview.Attributes.Add("src", ConfigurationManager.AppSettings["SiteUrl"] + "assets/images/dummy-preview.jpg");
        }
    }

    void GetProjectCostDetails(string ProjectID)
    {
        try
        {
            decimal RenovationCost = 0;
            decimal LoanProcessingFee = 0;
            decimal AdministrationFee = 0;
            decimal PermitApplicationFee = 0;
            decimal OverllAllProjectCost = 0;
            decimal TotalFormCost = 0;

            LoanProcessingFee = Convert.ToDecimal(Tools.GetConfigValue("LoanProcessingFee"));
            AdministrationFee = Convert.ToDecimal(Tools.GetConfigValue("AdministrationFee"));
            PermitApplicationFee = Convert.ToDecimal(Tools.GetConfigValue("PermitApplicationFee"));


            string ErrorIfAny = String.Empty;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectCostDetails @ProjectID";
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
                LoanProcessingFee = Convert.ToInt32(DS.Tables[0].Rows[0]["LoanProcessingFee"]);
                PermitApplicationFee = Convert.ToInt32(DS.Tables[0].Rows[0]["PermitApplicationFee"]);
                AdministrationFee = Convert.ToInt32(DS.Tables[0].Rows[0]["AdministrationFee"]);
                TotalFormCost = Convert.ToInt32(DS.Tables[2].Rows[0]["TotalFormFee"]);
                if (DS.Tables[0].Rows[0]["TotalProjectCost"].ToString() != "")
                {
                    RenovationCost = Convert.ToDecimal(DS.Tables[0].Rows[0]["TotalProjectCost"].ToString());
                }
                if (DS.Tables[0].Rows[0]["IsBankLoan"].ToString() != "")
                {
                    if (DS.Tables[0].Rows[0]["IsBankLoan"].ToString() == "0")
                    {
                        LoanProcessingFee = 0;
                    }
                    else
                    {
                    }
                }
                else
                {
                    LoanProcessingFee = 0;
                }
                if (DS.Tables[0].Rows[0]["IsPermitFeeRequired"].ToString() == "0")
                {
                    PermitApplicationFee = 0;
                }
                else
                {
                }
                OverllAllProjectCost = RenovationCost + TotalFormCost;
                lblTotalAmount.Text = Tools.FormatMoneyWithDecimal(OverllAllProjectCost.ToString());
            }
        }
        catch (Exception ex) { }
    }
    void GetProjectPaymentImages(string ProjectID)
    {
        try
        {
            string ErrorIfAny = String.Empty;
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectPaymentImages @ProjectID";
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
                rptPaymentImages.DataSource = DS;
                rptPaymentImages.DataBind();
                for (int i = 0; i <= DS.Tables[0].Rows.Count - 1; i++)
                {
                    StringBuilder sbImageSlider = new StringBuilder();
                    if (DS.Tables[0].Rows.Count > 0)
                    {
                        sbImageSlider.Append("<div class='modal fade hnm-img-slider' id='imgSlider" + Convert.ToString(DS.Tables[0].Rows[i]["PaymentID"]) + "'"
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
    protected void lnkSavePaymentImages_Click(object sender, EventArgs e)
    {
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
                GalleryImageUpload.SaveAs(Server.MapPath("/UploadedFiles/PaymentImages/") + OriginalFileName);
                ImagePath = ConfigurationManager.AppSettings["BaseUrl"] + "PaymentImages/" + OriginalFileName;
                pcPaymentSave.ShowOnPageLoad = true;
                imgPreview.Attributes.Add("src", ImagePath);
                Session["ImagePath"] = ImagePath.ToString();
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
    protected void btnSavePayment_Click(object sender, EventArgs e)
    {
        try
        {
            if (Session["ImagePath"].ToString() != "")
            {
                string ErrorIfAny = String.Empty;
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "SavePaymentImagesForProject @ProjectID, @ImagePath, @PaymentMethod, @PaidOn";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                    SqlParameters.Add(new SqlParameter("ImagePath", Session["ImagePath"].ToString()));
                    SqlParameters.Add(new SqlParameter("PaymentMethod", ddlModeofPayment.SelectedValue));
                    SqlParameters.Add(new SqlParameter("PaidOn", dtPaymentDate.Value));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                {
                    GetProjectPaymentImages(ProjectID);
                    imgPreview.Attributes.Add("src", ConfigurationManager.AppSettings["SiteUrl"] + "assets/images/dummy-preview.jpg");
                    pcPaymentSave.ShowOnPageLoad = false;
                    Session["ImagePath"] = "";
                }
            }
            else
            {
                lblPopUpMessage.Text = "Please choose a file.";
                ScriptManager.RegisterStartupScript(this, GetType(), "selectpop", "openInvalidMessageModal();", true);
            }
        }
        catch (Exception eX) { }
    }
}