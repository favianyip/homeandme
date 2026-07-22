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

public partial class Controls_Admincontrols_FileUploader : System.Web.UI.UserControl
{
    private string key;
    public string FileKey
    {
        get
        {
            return key;
        }
        set
        {
            key = value;
        }
    }

    private string wid;
    public string Wid
    {
        get
        {
            return wid;
        }
        set
        {
            wid = value;
        }
    }

    private string hgt;
    public string Hgt
    {
        get
        {
            return hgt;
        }
        set
        {
            hgt = value;
        }
    }

    private string displayType;
    public string DisplayType
    {
        get
        {
            return displayType;
        }
        set
        {
            displayType = value;
        }
    }

    protected void Page_Load(object sender, EventArgs e)
    {
        LoadFrame();
    }

    void LoadFrame()
    {
        popConfirm.ID = "popConfirm" + FileKey;
        popConfirm.ClientInstanceName = "popConfirm" + FileKey;
        lit.Text = "<iframe id=\"Iframe" + FileKey + "\" frameborder=\"0\" width=\"100%\" height=\"";
        if (displayType != null)
        {
            if (displayType != "")
            {
                lit.Text = lit.Text + "63\" src=\"../../Admin/ImageProcessorShowName.aspx?key=" + FileKey;
            }
            else
            {
                lit.Text = lit.Text + "230\" src=\"../../Admin/ImageProcessor.aspx?key=" + FileKey;

            }
        }
        else
        {
            lit.Text = lit.Text + "230\" src=\"../../Admin/ImageProcessor.aspx?key=" + FileKey;
        }
        if (wid != null)
        {
            if (wid != "")
            {
                lit.Text = lit.Text + "&wid=" + wid;
            }
        }
        if (hgt != null)
        {
            if (hgt != "")
            {
                lit.Text = lit.Text + "&hgt=" + hgt;
            }
        }
        if (displayType != null)
        {
            if (displayType != "")
            {
                lit.Text = lit.Text + "&type=" + displayType;
            }
        }
        lit.Text = lit.Text + "\" scrolling=\"no\" ></iframe>";
    }

    protected void popConfirm_WindowCallback(object source, PopupWindowCallbackArgs e)
    {
        litCrop.Text = "<iframe id=\"IframeCrop\" width=\"100%\" height=\"360px\" src=\"../../Admin/ImageCropPage.aspx?key=" + FileKey;
        if (wid != null)
        {
            litCrop.Text = litCrop.Text + "&wid=" + wid;
        }
        if (hgt != null)
        {
            litCrop.Text = litCrop.Text + "&hgt=" + hgt;
        }
        litCrop.Text = litCrop.Text + "\" scrolling=\"no\" ></iframe>";
    }

    public void ReloadFrame()
    {
        popConfirm.ShowOnPageLoad = false;
        LoadFrame();
    }
}