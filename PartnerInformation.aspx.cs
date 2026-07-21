using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class PartnerInformation : System.Web.UI.Page
{
    string ErrorIfAny = String.Empty;
    string UserID = String.Empty;
    string ProjectID = String.Empty;

    protected void Page_Load(object sender, EventArgs e)
    {
        try
        {
            if (Session["UserID"] != null && Session["UserID"] != "")
            {
                UserID = Session["UserID"].ToString();
            }
            else
            {
                Response.Redirect("/Home.aspx");
            }
            if (Session["ProjectID"] != null)
            {
                ProjectID = Session["ProjectID"].ToString();
                GetPatnerDetailsForProject(ProjectID);
                GetPreferredTimeSlotForProject(ProjectID);
                if(!IsDateForPartnerSelected(ProjectID))
                {
                    DivDateValue.Visible = false;
                    DivDateSelect.Visible = true;
                }
                else
                {
                    DivDateValue.Visible = true;
                    DivDateSelect.Visible = false;
                }
            }
        }
        catch (Exception ex) { }
    }

    void GetPatnerDetailsForProject(string ProjectID)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetPartnerInfoForProject @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (!Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
            {
                throw new Exception(ErrorIfAny);
            }
            else
            {
                rptProjectPartners.DataSource = DS;
                rptProjectPartners.DataBind();
            }
        }
        catch (Exception ex) { }
    }

    void GetPreferredTimeSlotForProject(string ProjectID)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM Projects WHERE ProjectID = @ProjectID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
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
                    if (DS.Tables[0].Rows[0]["UserRequestedDateForPartner"].ToString() != "")
                    {
                        TimeSlot.Visible = true;
                        lblRequestedDate.Text = Convert.ToDateTime(DS.Tables[0].Rows[0]["UserRequestedDateForPartner"]).ToString("dd MMMM yyyy");
                        lblRequestedTime.Text = Convert.ToDateTime(DS.Tables[0].Rows[0]["UserRequestedDateForPartner"]).ToString("hh:mm tt");
                    }
                    else
                    {
                        TimeSlot.Visible = false;
                    }
                }
            }
        }
        catch (Exception ex) { }
    }

    bool IsDateForPartnerSelected(string ProjectID)
    {
        bool IsDateForPartnerSelected = false;
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT * FROM Projects WHERE ProjectID = @ProjectID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
        {
            if(ds.Tables[0].Rows[0]["UserRequestedDateForPartner"] != null && Convert.ToString(ds.Tables[0].Rows[0]["UserRequestedDateForPartner"]) != string.Empty)
            {
                IsDateForPartnerSelected = true;
            }
        }
        return IsDateForPartnerSelected;
    }

    protected void DtDate_DateChanged(object sender, EventArgs e)
    {
        try
        {
            if (Convert.ToDateTime(DtDate.Value) < DateTime.Now)
            {
                lblDateMsg.Text = "Please select proper date and time!";
            }
            else
            {
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "UPDATE Projects SET UserRequestedDateForPartner = @RequestedDate WHERE ProjectID = @ProjectID";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                    SqlParameters.Add(new SqlParameter("RequestedDate", DtDate.Value));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                {
                    DivDateSelect.Visible = false;
                    DivDateValue.Visible = true;
                    lblDateMsg.Text = "";
                    lblRequestedDate.Text = DtDate.Date.ToString("dd MMMM yyyy");
                    lblRequestedTime.Text = DtDate.Date.ToString("hh:mm tt");
                    GetPatnerDetailsForProject(ProjectID);
                    GetPreferredTimeSlotForProject(ProjectID);
                }
            }
        }
        catch (Exception ex) { }
    }

    protected void lnkSave_Click(object sender, EventArgs e)
    {

    }
}