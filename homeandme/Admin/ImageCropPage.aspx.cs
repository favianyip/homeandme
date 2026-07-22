using System;
using System.Collections.Generic;
using System.Drawing;
using System.Configuration;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class ImageCropPage : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        LoadImageData();
    }

    public void LoadImageData()
    {
        if (Request.QueryString["wid"] != null)
        {
            hdnWth.Value = Request.QueryString["wid"].ToString().Trim();
        }
        if (Request.QueryString["hgt"] != null)
        {
            hdnHgt.Value = Request.QueryString["hgt"].ToString().Trim();
        }
        if (Request.QueryString["key"] != null)
        {
            hdnKey.Value = Request.QueryString["key"].ToString().Trim();
        }
        if (Session["File"] != null)
        {
            string key = hdnKey.Value;
            Dictionary<string, string> files = new Dictionary<string, string>();
            files = ((Dictionary<string, string>)Session["File"]);
            try
            {
                if (files.ContainsKey(key))
                {
                    hdnPath.Value = files[key].Replace("\\", "/").Replace(Server.MapPath("~/Admin/UploadedFiles/").Replace("\\", "/").Trim(), ConfigurationManager.AppSettings["ImgUploadUrl"].ToString().Trim());
                }
            }
            catch { }
        }
    }

    protected void btnCrop_Click(object sender, EventArgs e)
    {
        try
        {
            //ScriptManager.RegisterClientScriptBlock(this, typeof(System.Web.UI.Page), "popClose", "var w = parseInt($w, 10), h = parseInt($h, 10), s size = 'viewport'; if (w || h) { size = { width: w, height: h }; } $uploadCrop.croppie('result', { type: 'canvas', size: size }).then(function (resp) { $('#<%=hdnImagebase64.ClientID%>').val(resp); });", true);
            imgCropdImage.Src = hdnImagebase64.Value;
            lblMsg.Text = string.Empty;
            if (imgCropdImage.Src != string.Empty)
            {
                string base64 = hdnImagebase64.Value;
                string imgName = Guid.NewGuid().ToString();
                imgName = imgName.Replace('-', '_');
                string res = string.Empty;
                byte[] bytes = Convert.FromBase64String(base64.Split(',')[1]);
                string path = "~/Admin" + hdnPath.Value.Substring(hdnPath.Value.IndexOf("/Uploaded")).Replace(".", "z.");
                using (System.IO.FileStream stream = new System.IO.FileStream(Server.MapPath(path), System.IO.FileMode.Create))
                {
                    stream.Write(bytes, 0, bytes.Length);
                    stream.Flush();
                }
                lblMsg.Text = "Image Saved Successfully!";
                lblMsg.ForeColor = Color.Green;
                btnCrop.Visible = true;
                imgCropdImage.Src = string.Empty;
                UploadedImage.Visible = true;
                if (Session["File"] != null)
                {
                    string key = hdnKey.Value;
                    Dictionary<string, string> files = new Dictionary<string, string>();
                    files = ((Dictionary<string, string>)Session["File"]);
                    try
                    {
                        if (files.ContainsKey(key))
                        {
                            string newpath = files[key];
                            newpath = newpath.Substring(0, newpath.LastIndexOf(".")) + "z" + newpath.Substring(newpath.LastIndexOf("."));
                            files.Remove(key);
                            files.Add(key, newpath);
                            Session["File"] = files;
                        }
                    }
                    catch (Exception ex)
                    {
                        lblMsg.Text = ex.Message;
                    }
                    ScriptManager.RegisterClientScriptBlock(this, typeof(System.Web.UI.Page), "popClose", "var p = window.parent; var popup = p.window[\"popConfirm" + hdnKey.Value + "\"]; popup.Hide(); var iframe = p.document.getElementById(\"Iframe" + hdnKey.Value + "\"); iframe.src = iframe.src;", true);
                }
            }
            else
            {
                lblMsg.Text = "Image source is not set properly.";
                return;
            }
        }
        catch (Exception ex)
        {
            lblMsg.Text = ex.Message;
            lblMsg.ForeColor = Color.Red;
            return;
        }
    }
    protected void btnCancel_Click(object sender, EventArgs e)
    {
        if (Session["File"] != null)
        {
            string key = hdnKey.Value;
            Dictionary<string, string> files = new Dictionary<string, string>();
            files = ((Dictionary<string, string>)Session["File"]);
            try
            {
                if (files.ContainsKey(key))
                {
                    string newpath = files[key];
                    newpath = newpath.Substring(0, newpath.LastIndexOf(".")) + "z" + newpath.Substring(newpath.LastIndexOf("."));
                    files.Remove(key);
                }
            }
            catch { }
            ScriptManager.RegisterClientScriptBlock(this, typeof(System.Web.UI.Page), "popClose", "var p = window.parent; var popup = p.window[\"popConfirm" + hdnKey.Value + "\"]; popup.Hide(); var iframe = p.document.getElementById(\"Iframe" + hdnKey.Value + "\"); iframe.src = iframe.src;", true);
        }
    }
}