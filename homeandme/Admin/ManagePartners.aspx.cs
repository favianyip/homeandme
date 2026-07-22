using System;
using System.Collections.Generic;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;
using System.Data;
using System.Data.SqlClient;
public partial class Admin_ManagePartners : System.Web.UI.Page
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (!IsPostBack)
        {
            BindData();
        }
    }

    protected void btnNew_Click(object sender, EventArgs e)
    {
        try
        {
            divPartnerGrid.Visible = false;
            divPartnerForm.Visible = true;
            btnNew.Visible = true;
            HfPartnerID.Value = null;
            btnNew.Visible = false;
            ClearControls();
        }
        catch
        {
        }
    }

    protected void btnEdit_Click(object sender, EventArgs e)
    {
        try
        {
            divPartnerGrid.Visible = false;
            divPartnerForm.Visible = true;
            btnNew.Visible = false;
            string id = ((LinkButton)sender).CommandArgument;
            HfPartnerID.Value = id;
            string ErrorIfAny = string.Empty;
            DataSet Ds = new DataSet();
            List<Tools.SqlContainer> SQLCommands_Save = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetPartnerByID @PartnerID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PartnerID", id));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands_Save.Add(SQLContainer);
            }
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "GetSkillsByPartnerID @PartnerID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PartnerID", HfPartnerID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands_Save.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands_Save, out Ds, out ErrorIfAny))
            {
                String skills = String.Empty;
                foreach (DataRow Dr in Ds.Tables[1].Rows)
                {
                    TknSkills.Tokens.Add(Dr["Scope"].ToString());
                }

                txtName.Text = Ds.Tables[0].Rows[0]["Name"].ToString();
                txtEmail.Text = Ds.Tables[0].Rows[0]["Email"].ToString();
                TxtContact.Text = Ds.Tables[0].Rows[0]["Contact"].ToString();
                ddlStatus.SelectedValue = Convert.ToString(Ds.Tables[0].Rows[0]["Status"].ToString());
                txtCompanyAddress1.Text = Ds.Tables[0].Rows[0]["CompanyAddress1"].ToString();
                txtCompanyAddress2.Text = Ds.Tables[0].Rows[0]["CompanyAddress2"].ToString();
                txtCompanyName.Text = Ds.Tables[0].Rows[0]["CompanyName"].ToString();
                txtCompanyRegisterNumber.Text = Ds.Tables[0].Rows[0]["CompanyRegisterNumber"].ToString();
                txtContractorName.Text = Ds.Tables[0].Rows[0]["Contractor"].ToString();
            }
            else
            {
                ErrorDisplay.ShowAlertMessage("Error found, please try again.");
            }
        }
        catch
        {

        }
    }

    protected void btnSave_Click(object sender, EventArgs e)
    {
        try
        {
            if (Page.IsValid)
            {
                string ErrorIfAny = string.Empty;
                string skills = string.Empty;
                int a = TknSkills.Tokens.Count;
                for (int i = 0; i < a; i++)
                {
                    skills = skills + TknSkills.Tokens[i] + ",";
                }
                List<Tools.SqlContainer> SqlCommand = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "SELECT * FROM Scopes";
                    SqlCommand.Add(SQLContainer);
                }
                DataSet DsScopes = new DataSet();
                if (Tools.GetData(SqlCommand, out DsScopes, out ErrorIfAny))
                {
                    foreach (DataRow Dr in DsScopes.Tables[0].Rows)
                    {
                        if (skills.Contains(Dr["Scope"].ToString()))
                        {
                            skills = skills.Replace(Dr["Scope"].ToString(), Dr["ScopeID"].ToString());
                        }
                    }
                }
                DataSet Ds = new DataSet();
                if (HfPartnerID.Value == null || HfPartnerID.Value == "")
                {
                    List<Tools.SqlContainer> SQLCommands_Save = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "Create_Partners @Name, @Email,@Company,@Skills,@Contact,@Contractor,@CompanyName,@CompanyRegisterNumber,@CompanyAddress1,@CompanyAddress2";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("Name", txtName.Text.ToString()));
                        SqlParameters.Add(new SqlParameter("Email", txtEmail.Text.ToString()));
                        SqlParameters.Add(new SqlParameter("Company", "1")); ;
                        SqlParameters.Add(new SqlParameter("Skills", skills));
                        SqlParameters.Add(new SqlParameter("Contact", TxtContact.Text.ToString().Trim()));
                        SqlParameters.Add(new SqlParameter("Contractor", txtContractorName.Text.ToString().Trim()));
                        SqlParameters.Add(new SqlParameter("CompanyName", txtCompanyName.Text.ToString().Trim()));
                        SqlParameters.Add(new SqlParameter("CompanyRegisterNumber", txtCompanyRegisterNumber.Text.ToString().Trim()));
                        SqlParameters.Add(new SqlParameter("CompanyAddress1", txtCompanyAddress1.Text.ToString().Trim()));
                        SqlParameters.Add(new SqlParameter("CompanyAddress2", txtCompanyAddress2.Text.ToString().Trim()));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands_Save.Add(SQLContainer);
                        if (Tools.GetData(SQLCommands_Save, out Ds, out ErrorIfAny))
                        {
                            if (Ds.Tables[0].Rows[0]["Exist"].ToString() == "0")
                            {
                                ErrorDisplay.ShowAlertMessage("Email already exists");
                            }
                            else
                            {
                                BindData();
                                divPartnerGrid.Visible = true;
                                divPartnerForm.Visible = false;
                                btnNew.Visible = true;
                            }
                        }
                        else
                        {
                            lblSubCategoryMsg.Text = ErrorIfAny;
                        }
                    }
                }
                else
                {
                    List<Tools.SqlContainer> SQLCommands_Save = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "UpdatePartner @PartnerID,@Name,@Email,@Contact,@Skills,@Status,@Contractor,@CompanyName,@CompanyRegisterNumber,@CompanyAddress1,@CompanyAddress2";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("PartnerID", HfPartnerID.Value));
                        SqlParameters.Add(new SqlParameter("Name", txtName.Text.ToString()));
                        SqlParameters.Add(new SqlParameter("Email", txtEmail.Text.ToString()));
                        SqlParameters.Add(new SqlParameter("Contact", TxtContact.Text.ToString()));
                        SqlParameters.Add(new SqlParameter("Skills", skills));
                        SqlParameters.Add(new SqlParameter("Status", ddlStatus.SelectedValue));
                        SqlParameters.Add(new SqlParameter("Contractor", txtContractorName.Text.ToString().Trim()));
                        SqlParameters.Add(new SqlParameter("CompanyName", txtCompanyName.Text.ToString().Trim()));
                        SqlParameters.Add(new SqlParameter("CompanyRegisterNumber", txtCompanyRegisterNumber.Text.ToString().Trim()));
                        SqlParameters.Add(new SqlParameter("CompanyAddress1", txtCompanyAddress1.Text.ToString().Trim()));
                        SqlParameters.Add(new SqlParameter("CompanyAddress2", txtCompanyAddress2.Text.ToString().Trim()));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands_Save.Add(SQLContainer);
                        if (Tools.GetData(SQLCommands_Save, out Ds, out ErrorIfAny))
                        {
                            BindData();
                            divPartnerGrid.Visible = true;
                            divPartnerForm.Visible = false;
                            btnNew.Visible = true;
                            Response.Redirect(Request.RawUrl);
                        }
                        else
                        {
                            lblSubCategoryMsg.Text = "Error found, please try again.";
                        }
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    void BindData()
    {
        GridPartners.DataBind();
        divPartnerForm.Visible = false;
        divPartnerGrid.Visible = true;
        btnNew.Visible = true;
        try
        {
            string ErrorIfAny = String.Empty;
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT ScopeID,Scope FROM Scopes";
                List<SqlParameter> SqlParametersList = new List<SqlParameter>();
                SQLCommands.Add(SQLContainer);
            }
            DataSet ds = new DataSet();
            if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
            {
                TknSkills.TextField = "Scope";
                TknSkills.ValueField = "ScopeID";
                TknSkills.DataSource = ds.Tables[0];
                TknSkills.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        try
        {
            divPartnerGrid.Visible = true;
            divPartnerForm.Visible = false;
            btnNew.Visible = true;
            ClearControls();
            lblSubCategoryMsg.Text = " ";
        }
        catch (Exception eX) { }
    }

    void ClearControls()
    {
        txtName.Text = String.Empty;
        txtEmail.Text = String.Empty;
        TknSkills.Text = null;
        TxtContact.Text = string.Empty;
        txtCompanyAddress1.Text = string.Empty;
        txtCompanyAddress2.Text = string.Empty;
        txtCompanyName.Text = string.Empty;
        txtCompanyRegisterNumber.Text = string.Empty;
        txtContractorName.Text = string.Empty;
    }

    protected void btnManageProduct_Click(object sender, EventArgs e)
    {
        try
        {
            string id = ((LinkButton)sender).CommandArgument;
            string name = ((LinkButton)sender).CommandName;
            Session["PartnerID"] = id.ToString();
            Session["PartnerName"] = name.ToString();
            Response.Redirect("/Admin/ManageProductsForPartner.aspx");
        }
        catch (Exception ex) { }
    }
}