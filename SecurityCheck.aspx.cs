using Newtonsoft.Json;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Net;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class SecurityCheck : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            if (!IsPostBack)
            {
                lblMessage.Text = string.Empty;

                if (Session["RetrunLocationAfterCaptcha"] == null || Session["RetrunLocationAfterCaptcha"].ToString().Trim().Equals(string.Empty))
                {
                    Session["RetrunLocationAfterCaptcha"] = "Welcome";
                }
                Session["IsCaptchaSolved"] = 0;
            }
        }
        catch { }
    }

    protected void btnProceed_Click(object sender, EventArgs e)
    {
        try
        {
            lblMessage.Text = string.Empty;

            if (!ValidateCaptcha())
            {
                throw new Exception("Please validate the captcha to proceed...");
            }

            Session["IsCaptchaSolved"] = 1;
        }
        catch (Exception eX)
        {
            lblMessage.Text = eX.Message;
        }

        {
            if (Session["IsCaptchaSolved"] == null || Session["IsCaptchaSolved"].ToString().Trim().Equals(string.Empty))
            {
                Response.Redirect("~/securitycheck.aspx");
            }
            if (Session["RetrunLocationAfterCaptcha"] == null || Session["RetrunLocationAfterCaptcha"].ToString().Trim().Equals(string.Empty))
            {
                Session["RetrunLocationAfterCaptcha"] = "Login";
            }
        }

        if (Session["IsCaptchaSolved"].ToString().Trim().Equals("1"))
        {
            if (Session["RetrunLocationAfterCaptcha"].ToString().Trim().Equals("Welcome"))
            {
                Response.Redirect("~/Welcome.aspx");
            }
        }
    }

    public bool ValidateCaptcha()
    {
        bool IsCaptchaCompleted = false;
        try
        {
            var response = Request["g-recaptcha-response"];
            const string secret = "6LdA46YgAAAAACY00BWm6GdcuCrmfLV6f-VizOjM";
            var client = new WebClient();
            var reply = client.DownloadString(string.Format("https://www.google.com/recaptcha/api/siteverify?secret={0}&response={1}", secret, response));
            var captchaResponse = JsonConvert.DeserializeObject<CaptchaResponse>(reply);
            IsCaptchaCompleted = captchaResponse.Success;
        }
        catch { }
        return IsCaptchaCompleted;
    }
}