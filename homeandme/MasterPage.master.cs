using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class MasterPage : System.Web.UI.MasterPage
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (Session[Tools.SessionVariables.AuthorisationID] == null)
        {
            Response.Redirect("Welcome.aspx");
            return;
        }
        if (Session["UserID"] != null && Session["UserID"] != "")
        {
            liLogin.Visible = false;
            liLogout.Visible = true;
            liMyAccount.Visible = true;
        }
        else
        {
            liLogin.Visible = true;
            liLogout.Visible = false;
            liMyAccount.Visible = false;
        }
    }
}
