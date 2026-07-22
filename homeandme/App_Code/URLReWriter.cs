using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.IO;
using System.Data.SqlClient;
using System.Text;
using System.Data;

public class URLRewriter : IHttpModule
{
    public static bool IsReWritingEnabled { get; private set; }

    #region IHttpModule Members

    public void Dispose() { }

    public void Init(HttpApplication context)
    {
        IsReWritingEnabled = true;

        context.BeginRequest += (s, e) =>
        {
            var Application = s as HttpApplication;
            //if (!Application.Request.IsSecureConnection)
            //{
            //    // send user to SSL 
            //    string serverName = HttpUtility.UrlEncode(Application.Request.ServerVariables["SERVER_NAME"]);
            //    string filePath = Application.Request.FilePath;
            //    if (Application.Request.Url.Host.Contains("www."))
            //    {
            //        Application.Response.Redirect("https://" + serverName + filePath);
            //    }
            //    else
            //    {
            //        Application.Response.Redirect("https://www." + serverName + filePath);
            //    }
            //}
            var PhysicalPath = Application.Request.PhysicalPath;
            if (!File.Exists(PhysicalPath) && !Path.HasExtension(PhysicalPath))
            {
                var argString = "";
                if (Application.Request.RawUrl.Contains("?"))
                {
                    argString = Application.Request.RawUrl.Replace("\\", "/").TrimStart('/');
                    argString = argString.Substring(0, argString.IndexOf("?"));
                }
                else
                {
                    argString = Application.Request.RawUrl.Replace("\\", "/").TrimStart('/');
                }
                if (!string.IsNullOrEmpty(argString))
                {
                    var args = argString.Split('/');
                    #region Page
                    if (args.Contains("ProductDetails"))
                    {
                        var URLBuilder = new StringBuilder("/ProductDetails.aspx");
                        if(args[1] == "" || args[1] == null)
                        {
                            Application.Response.Redirect("/Login.aspx");
                        }
                        URLBuilder.Append("?code=" + args[1].ToString());
                        Application.Context.RewritePath(URLBuilder.ToString());
                    }
                    //else if (args.Length > 3)
                    //{
                    //    var URLBuilder = new StringBuilder("/content.aspx");
                    //    URLBuilder.Append("?lang=" + args[0].ToString() + "&page=" + args[1].ToString() + "&id=" + args[2].ToString() + "&id2=" + args[3].ToString());
                    //    Application.Context.RewritePath(URLBuilder.ToString());
                    //}
                    //else if (args.Length > 2)
                    //{
                    //    var URLBuilder = new StringBuilder("/content.aspx");
                    //    URLBuilder.Append("?lang=" + args[0].ToString() + "&page=" + args[1].ToString() + "&id=" + args[2].ToString());
                    //    Application.Context.RewritePath(URLBuilder.ToString());
                    //}
                    //else if (args.Length > 1)
                    //{
                    //    var URLBuilder = new StringBuilder("/content.aspx");
                    //    URLBuilder.Append("?lang=" + args[0].ToString() + "&page=" + args[1].ToString());
                    //    Application.Context.RewritePath(URLBuilder.ToString());
                    //}
                    //else
                    //{
                    //    Application.Response.Redirect("/en/home");
                    //}
                    #endregion
                }
                else
                {
                    Application.Response.Redirect("/en/home");
                }
            }
        };
    }

    #endregion
}
