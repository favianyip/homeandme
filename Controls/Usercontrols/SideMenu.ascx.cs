using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Controls_Usercontrols_SideMenu : System.Web.UI.UserControl
{
    string ErrorIfAny = string.Empty;
    public string PageName
    {
        get;
        set;
    }
    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            if (!IsPostBack)
            {
                if (Session["UserID"] == null && Session["UserID"] == "")
                {
                    Response.Redirect("/Home.aspx");
                }
                else
                {
                    GetProjectsForUser(Session["UserID"].ToString());
                    if (Session["ProjectID"] == null || Session["ProjectID"] == "")
                    {
                        Session["ProjectID"] = ddlProjects.SelectedValue.ToString();
                    }
                    else
                    {
                        ddlProjects.SelectedValue = Session["ProjectID"].ToString();
                    }
                }
            }
            LoadSideMenus();
        }
        catch (Exception ex) { }
    }

    void GetProjectsForUser(string UserID)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectsForUser @UserID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("UserID", UserID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                if (DS.Tables[0].Rows.Count > 0)
                {
                    divProjects.Visible = true;
                    ddlProjects.DataTextField = "Project";
                    ddlProjects.DataValueField = "ID";
                    ddlProjects.DataSource = DS.Tables[0];
                    ddlProjects.DataBind();
                }
                else
                {
                    divProjects.Visible = false;
                }
                if (Session["ProjectID"] == null && Session["ProjectID"] == "")
                {
                    Session["ProjectID"] = Convert.ToString(DS.Tables[0].Rows[DS.Tables[0].Rows.Count - 1]["ID"].ToString());
                }
            }
        }
        catch (Exception ex) { }
    }

    void LoadSideMenus()
    {
        try
        {
            PageName = Path.GetFileName(Request.Path);
            if (PageName != null)
            {
                if (PageName.ToLower().Contains("myprofile"))
                {
                    anMyprofile.Attributes.Add("class", "hnm-sidebar__link active");
                    anAddressInfo.Attributes.Add("class", "hnm-sidebar__link");
                    anProjectDetails.Attributes.Add("class", "hnm-sidebar__link");
                    anPropertyDetails.Attributes.Add("class", "hnm-sidebar__link");
                    anPartnerInfo.Attributes.Add("class", "hnm-sidebar__link");
                    anPayment.Attributes.Add("class", "hnm-sidebar__link");
                }
                if (PageName.ToLower().Contains("addressinformation"))
                {
                    anMyprofile.Attributes.Add("class", "hnm-sidebar__link");
                    anAddressInfo.Attributes.Add("class", "hnm-sidebar__link active");
                    anProjectDetails.Attributes.Add("class", "hnm-sidebar__link");
                    anPropertyDetails.Attributes.Add("class", "hnm-sidebar__link");
                    anPartnerInfo.Attributes.Add("class", "hnm-sidebar__link");
                    anPayment.Attributes.Add("class", "hnm-sidebar__link");
                }
                if (PageName.ToLower().Contains("projectdetails"))
                {
                    anMyprofile.Attributes.Add("class", "hnm-sidebar__link");
                    anAddressInfo.Attributes.Add("class", "hnm-sidebar__link");
                    anProjectDetails.Attributes.Add("class", "hnm-sidebar__link active");
                    anPropertyDetails.Attributes.Add("class", "hnm-sidebar__link");
                    anPartnerInfo.Attributes.Add("class", "hnm-sidebar__link");
                    anPayment.Attributes.Add("class", "hnm-sidebar__link");
                }
                if (PageName.ToLower().Contains("propertydetails"))
                {
                    anMyprofile.Attributes.Add("class", "hnm-sidebar__link");
                    anAddressInfo.Attributes.Add("class", "hnm-sidebar__link");
                    anProjectDetails.Attributes.Add("class", "hnm-sidebar__link");
                    anPropertyDetails.Attributes.Add("class", "hnm-sidebar__link active");
                    anPartnerInfo.Attributes.Add("class", "hnm-sidebar__link");
                    anPayment.Attributes.Add("class", "hnm-sidebar__link");
                }
                if (PageName.ToLower().Contains("partnerinformation"))
                {
                    anMyprofile.Attributes.Add("class", "hnm-sidebar__link");
                    anAddressInfo.Attributes.Add("class", "hnm-sidebar__link");
                    anProjectDetails.Attributes.Add("class", "hnm-sidebar__link");
                    anPropertyDetails.Attributes.Add("class", "hnm-sidebar__link");
                    anPartnerInfo.Attributes.Add("class", "hnm-sidebar__link active");
                    anPayment.Attributes.Add("class", "hnm-sidebar__link");
                }
                if (PageName.ToLower().Contains("paymentdetails"))
                {
                    anMyprofile.Attributes.Add("class", "hnm-sidebar__link");
                    anAddressInfo.Attributes.Add("class", "hnm-sidebar__link");
                    anProjectDetails.Attributes.Add("class", "hnm-sidebar__link");
                    anPropertyDetails.Attributes.Add("class", "hnm-sidebar__link");
                    anPartnerInfo.Attributes.Add("class", "hnm-sidebar__link");
                    anPayment.Attributes.Add("class", "hnm-sidebar__link active");
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void ddlProjects_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            Session["ProjectID"] = ddlProjects.SelectedValue.ToString();
            Response.Redirect("/MyProfile.aspx");
        }
        catch (Exception ex) { }
    }
}