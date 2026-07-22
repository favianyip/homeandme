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

public partial class ImageProcessorShowName : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
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

        //Determine width and height of uploaded image
        float UploadedImageWidth = UploadedImage.PhysicalDimension.Width;
        float UploadedImageHeight = UploadedImage.PhysicalDimension.Height;
        float wth = UploadedImageWidth;
        float hgt = UploadedImageHeight;
        if (Request.QueryString["wid"] != null)
        {
            float.TryParse(Request.QueryString["wid"].ToString().Trim(), out wth);
        }
        if (Request.QueryString["hgt"] != null)
        {
            float.TryParse(Request.QueryString["hgt"].ToString().Trim(), out hgt);
        }
        if (wth != UploadedImageWidth && hgt != UploadedImageHeight)
        {
            fullFileName = "Error";
            return "incorrect image dimension.";
        }
        string fileName = Path.ChangeExtension(Guid.NewGuid().ToString().Replace("-", ""), name.Substring(name.LastIndexOf(".")));
        fullFileName = CombinePath(fileName);
        uploadedFile.SaveAs(fullFileName, true);
        return fileName;
    }

    protected string CombinePath(string fileName)
    {
        return Path.Combine(Server.MapPath("~/Admin/UploadedFiles/"), fileName);
    }
}