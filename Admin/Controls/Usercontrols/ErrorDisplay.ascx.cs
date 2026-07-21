using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Controls_Usercontrols_ErrorDisplay : System.Web.UI.UserControl
{
    private string controlType;

    public string ControlType
    {
        get
        {
            return controlType;
        }
        set
        {
            controlType = value;
        }
    }

    protected void Page_Load(object sender, EventArgs e)
    {

    }

    public void ShowAlertMessage(string Message)
    {
        litAlert.Text = Message;
        pcAlert.ShowOnPageLoad = true;
    }
}