using System;
using System.Collections.Generic;
using System.Drawing;
using System.Configuration;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Controls_Admincontrols_ImageCrop : System.Web.UI.UserControl
{
    public string ImagePath
    {
        get
        {
            return hdnPath.Value;
        }
        set
        {
            hdnPath.Value = value;
        }
    }

    public string ImageKey
    {
        get
        {
            return hdnKey.Value;
        }
        set
        {
            hdnKey.Value = value;
        }
    }

    public string ImageHeight
    {
        get
        {
            return hdnHgt.Value;
        }
        set
        {
            hdnHgt.Value = value;
        }
    }

    public string ImageWidth
    {
        get
        {
            return hdnWth.Value;
        }
        set
        {
            hdnWth.Value = value;
        }
    }

    protected void Page_Load(object sender, EventArgs e)
    {
        LoadImageData();
    }

    public void LoadImageData()
    {
        lit.Text = "<iframe id=\"IframeCrop\" runat=\"server\" frameborder=\"0\" width=\"100%\" height=\"360px\" src=\"../../Admin/ImageCropPage.aspx?key=" + hdnKey.Value
            + "&wid=" + hdnWth.Value
            + "&hgt=" + hdnHgt.Value
            + "\" scrolling=\"no\" ></iframe>";
    }
}