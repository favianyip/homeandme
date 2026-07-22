using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using DevExpress.Web;
using System.IO;
using System.Drawing;
using DevExpress.Web.Internal;

public partial class ImageProcessor : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Request.QueryString["key"] != null)
        {
            string key = Request.QueryString["key"].ToString().Trim();
            Dictionary<string, string> files = new Dictionary<string, string>();
            if (Session["File"] != null)
            {
                files = ((Dictionary<string, string>)Session["File"]);
            }
            if (files.ContainsKey(key))
            {
                UploadControl.Visible = false;
                div.Visible = false;
                divImg.Visible = true;
                newuploadedImage.Visible = true;
                if (files[key].Contains("\\"))
                {
                    newuploadedImage.Src = "/Admin/UploadedFiles/" + files[key].Substring(files[key].LastIndexOf("\\"));
                }
                else
                {
                    newuploadedImage.Src = files[key];
                }
            }
        }
        lblSize.Text = "";
    }

    protected void UploadControl_FileUploadComplete(object sender, FileUploadCompleteEventArgs e)
    {
        if (Request.QueryString["key"] != null)
        {
            string key = Request.QueryString["key"].ToString().Trim();
            string filePath = "";
            e.CallbackData = SavePostedFile(e.UploadedFile, out filePath);
            if (filePath == "Error")
            {
                e.IsValid = false;
                return;
            }
            Dictionary<string, string> files = new Dictionary<string, string>();
            if (Session["File"] != null)
            {
                files = ((Dictionary<string, string>)Session["File"]);
            }
            if (files.ContainsKey(key))
            {
                files.Remove(key);
            }
            files.Add(key, filePath);
            Session["File"] = files;
        }
    }

    protected string SavePostedFile(UploadedFile uploadedFile, out string fullFileName)
    {
        fullFileName = "";
        if (!uploadedFile.IsValid)
            return string.Empty;
        string name = uploadedFile.FileName;
        System.Drawing.Image UploadedImage = System.Drawing.Image.FromStream(uploadedFile.FileContent);

        string fileName = Path.ChangeExtension(Guid.NewGuid().ToString().Replace("-", ""), name.Substring(name.LastIndexOf(".")));
        fullFileName = "/Admin/UploadedFiles/" + fileName;
        fullFileName = CombinePath(fileName);
        uploadedFile.SaveAs(fullFileName, true);
        return fileName;
    }

    protected string CombinePath(string fileName)
    {
        return Path.Combine(Server.MapPath("~/Admin/UploadedFiles/"), fileName);
    }

    protected void btnDelete_Click(object sender, EventArgs e)
    {
        string key = Request.QueryString["key"].ToString().Trim();
        Dictionary<string, string> files = new Dictionary<string, string>();
        if (Session["File"] != null)
        {
            files = ((Dictionary<string, string>)Session["File"]);
        }
        try
        {
            File.Delete(files[key]);
        }
        catch { }
        files.Remove(key);
        Session["File"] = files;
        Response.Redirect(Request.RawUrl);
    }
}