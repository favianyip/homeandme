using DevExpress.Web;
using System;
using System.Collections.Generic;
using System.Data;
using System.Data.SqlClient;
using System.Linq;
using System.Text;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class ProjectDetails : System.Web.UI.Page
{
    string ProjectID = String.Empty;
    string ErrorIfAny = String.Empty;
    string UserID = String.Empty;
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
            }
            GetRoomDetails(ProjectID);
            GetSubcontractorDetails(ProjectID);
            GetProjectCostDetails(ProjectID);
        }
        catch (Exception ex) { }
    }

    void GetRoomDetails(string ProjectID)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetRoomDetailsForProject @ProjectID";
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
                rptRoomDetails.DataSource = DS;
                rptRoomDetails.DataBind();
            }
        }
        catch (Exception ex) { }
    }

    void IsPartnerAssigned()
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM Partners_in_Projects WHERE ProjectID =  @ProjectID AND Status = 1";
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
                    lnkCostingBySubCon.Visible = true;
                }
                else
                {
                    lnkCostingBySubCon.Visible = false;
                }
            }
        }
        catch (Exception eX) { }
    }

    void GetSubcontractorDetails(string ProjectID)
    {
        try
        {
            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetSubconDetailsForProject @ProjectID";
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
                rptSubconDetails.DataSource = DS;
                rptSubconDetails.DataBind();
            }
        }
        catch (Exception ex) { }
    }

    void GetProjectCostDetails(string ProjectID)
    {
        try
        {
            decimal RenovationCost = 0;
            decimal LoanProcessingFee = 0;
            decimal AdministrationFee = 0;
            decimal PermitApplicationFee = 0;
            decimal OverllAllProjectCost = 0;
            divOverAll.Visible = true;
            LoanProcessingFee = Convert.ToDecimal(Tools.GetConfigValue("LoanProcessingFee"));
            AdministrationFee = Convert.ToDecimal(Tools.GetConfigValue("AdministrationFee"));
            PermitApplicationFee = Convert.ToDecimal(Tools.GetConfigValue("PermitApplicationFee"));

            DataSet DS = new DataSet();
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetProjectCostDetails @ProjectID";
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
                StringBuilder sbString = new StringBuilder();
                lblStatusText.Text = Convert.ToString(DS.Tables[0].Rows[0]["ProjectStatus"]);
                LoanProcessingFee = Convert.ToInt32(DS.Tables[0].Rows[0]["LoanProcessingFee"]);
                PermitApplicationFee = Convert.ToInt32(DS.Tables[0].Rows[0]["PermitApplicationFee"]);
                AdministrationFee = Convert.ToInt32(DS.Tables[0].Rows[0]["AdministrationFee"]);
                if (DS.Tables[0].Rows[0]["TotalProjectCost"].ToString() != "")
                {
                    RenovationCost = Convert.ToDecimal(DS.Tables[0].Rows[0]["ProjectCost"].ToString());
                }
                if (DS.Tables[0].Rows[0]["IsBankLoan"].ToString() != "")
                {
                    if (DS.Tables[0].Rows[0]["IsBankLoan"].ToString() == "0")
                    {
                        LoanProcessingFee = 0;
                    }
                    else
                    {
                        LoanProcessingFee = Convert.ToInt32(DS.Tables[0].Rows[0]["LoanProcessingFee"]);
                    }
                }
                else
                {
                    LoanProcessingFee = 0;
                }
                if (DS.Tables[0].Rows[0]["IsPermitFeeRequired"].ToString() == "0")
                {
                    PermitApplicationFee = 0;
                }
                else
                {
                    PermitApplicationFee = Convert.ToInt32(DS.Tables[0].Rows[0]["PermitApplicationFee"]);
                }

                if (Convert.ToString(DS.Tables[0].Rows[0]["FinalAdjustmentCost"]) == "" || Convert.ToString(DS.Tables[0].Rows[0]["FinalAdjustmentCost"]) == null)
                {
                    divFinalAdjustmentCost.Visible = false;
                    divProjectCost.Visible = false;
                    lblTotalAmount.Text = Tools.FormatMoneyWithDecimal(Convert.ToString(DS.Tables[0].Rows[0]["TotalProjectCost"].ToString()));
                }
                else
                {
                    divFinalAdjustmentCost.Visible = true;
                    divProjectCost.Visible = true;
                    divOverAll.Visible = false;
                    lblFinalAdjustmentCost.Text = Tools.FormatMoneyWithDecimal(Convert.ToString(DS.Tables[0].Rows[0]["CostDifference"]));
                    lblOverallProjectCost.Text = Tools.FormatMoneyWithDecimal(Convert.ToString(DS.Tables[0].Rows[0]["FinalAdjustmentCost"]));
                    decimal CostDifference = Convert.ToDecimal(DS.Tables[0].Rows[0]["CostDifference"]);
                    decimal Total = RenovationCost + CostDifference;
                    lblTotalAmount.Text = Tools.FormatMoneyWithDecimal(Total.ToString());
                }
                if (DS.Tables[1].Rows.Count > 0)
                {
                    rptProjectFees.DataSource = DS.Tables[1];
                    rptProjectFees.DataBind();
                }
                decimal TotalFormFee = Convert.ToInt32(DS.Tables[2].Rows[0]["TotalFormFee"]);
                OverllAllProjectCost = RenovationCost + TotalFormFee;
                lblRenovationCost.Text = Tools.FormatMoneyWithDecimal(RenovationCost.ToString());
                lblTotalProjectCost.Text = Tools.FormatMoneyWithDecimal(OverllAllProjectCost.ToString());
            }
        }
        catch (Exception ex) { }
    }

    protected void lnkCosting_Click(object sender, EventArgs e)
    {
        try
        {
            DivRoomDetails.Visible = true;
            DivSubconDetails.Visible = false;
        }
        catch (Exception ex) { }
    }

    protected void lnkCostingBySubCon_Click(object sender, EventArgs e)
    {
        try
        {
            DivRoomDetails.Visible = false;
            DivSubconDetails.Visible = true;
        }
        catch (Exception ex) { }
    }

    protected void GridRoomScopes_DetailRowExpandedChanged(object sender, DevExpress.Web.ASPxGridViewDetailRowEventArgs e)
    {
        try
        {
            string[] ary = new string[1];
            ary[0] = "ScopeID";
            int id = e.VisibleIndex;
            Session["ScopeID"] = ((ASPxGridView)sender).GetRowValues(id, ary).ToString().Trim();
        }
        catch (Exception ex) { }
    }

    protected void GridRoomScopes_BeforePerformDataSelect(object sender, EventArgs e)
    {
        try
        {
            Session["ScopeID"] = (sender as ASPxGridView).GetMasterRowKeyValue();
        }
        catch (Exception ex) { }
    }

    protected void GridRoomScopes_PageIndexChanged(object sender, EventArgs e)
    {

    }

    protected void GridRoomOptions_BeforePerformDataSelect(object sender, EventArgs e)
    {
        try
        {
            Session["ScopeID"] = (sender as ASPxGridView).GetMasterRowKeyValue();
            ASPxGridView grid = new ASPxGridView();
            grid = ((ASPxGridView)sender);
            updateOrderID(grid);
        }
        catch (Exception ex) { }
    }

    void updateOrderID(ASPxGridView grid)
    {
        try
        {
            if (Session["ScopeID"] == null) { }
        }
        catch (Exception ex) { }
    }
}