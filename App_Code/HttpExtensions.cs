using System;
using System.Data;
using System.Configuration;
using System.Linq;
using System.Web;
using System.Web.Security;
using System.Web.UI;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using System.Web.UI.WebControls.WebParts;
using System.Xml.Linq;

public static class HttpExtensions
{
    public static void ForceDownload(this HttpResponse Response, string virtualPath, string fileName)
    {
        try
        {
            Response.Clear();
            Response.AddHeader("content-disposition", "attachment; filename=" + fileName);
            Response.WriteFile(virtualPath);
            Response.ContentType = "";
            Response.End();
        }
        catch { }
    }
}
