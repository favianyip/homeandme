using Amazon.S3;
using Amazon.S3.Model;
using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Web;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class Admin_Controls_AdminControls_ProductSettings : System.Web.UI.UserControl
{
    protected void Page_Load(object sender, EventArgs e)
    {
        if (!IsPostBack)
        {
            ReloadControl();
        }
    }

    public void ReloadControl()
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT '-1' ScopeID, '...SELECT...' Scope  UNION SELECT ScopeID,Scope FROM Scopes ORDER BY Scope ASC";
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                cmbScopes.DataSource = ds.Tables[0];
                cmbScopes.DataBind();
                if (Convert.ToString(cmbScopes.SelectedItem.Value) == "-1")
                {
                    cmbCategory.SelectedItem = null;
                    cmbCategory.Text = "";
                }
                cmbCategory.DataBind();
                divGrid.Visible = false;
                GridProducts.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void cmbScopes_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            lblCategorymsg.Visible = false;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT [Option],OptionID FROM Options WHERE ScopeID=@ScopeID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("ScopeID", cmbScopes.SelectedItem.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (Convert.ToString(cmbScopes.SelectedItem.Value) == "-1")
                {
                    ReloadControl();
                }
                else
                {
                    if (ds.Tables[0].Rows.Count > 0)
                    {
                        btnNew.Visible = true;
                        divGrid.Visible = true;
                        cmbCategory.DataBind();
                        GridProducts.DataBind();
                    }
                    else
                    {
                        btnNew.Visible = false;
                        divGrid.Visible = false;
                        lblCategorymsg.Visible = true;
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void cmbCategory_SelectedIndexChanged(object sender, EventArgs e)
    {
        try
        {
            divGrid.Visible = true;
            GridProducts.DataBind();
        }
        catch (Exception eX) { }
    }

    protected void btnNew_Click(object sender, EventArgs e)
    {
        try
        {
            hdnSubOptionID.Value = "-1";
            divGrid.Visible = false;
            divEditCreate.Visible = true;
            btnNew.Visible = false;
            DivtopItems.Visible = false;
            SubOptionImage.ImageUrl = String.Empty;
        }
        catch (Exception eX) { }
    }

    protected void btnEdit_Click(object sender, EventArgs e)
    {
        try
        {
            LinkButton btn = (LinkButton)sender;
            hdnSubOptionID.Value = btn.CommandArgument;
            divGrid.Visible = false;
            divEditCreate.Visible = true;
            btnNew.Visible = false;
            DivtopItems.Visible = false;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT * FROM SubOptions WHERE SubOptionID=@SubOptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("SubOptionID", hdnSubOptionID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    txtSubOption.Text = Convert.ToString(ds.Tables[0].Rows[0]["SubOption"]);
                    SubOptionImage.ImageUrl = Convert.ToString(ds.Tables[0].Rows[0]["ImageUrl"]);
                    cmbIsHidden.SelectedIndex = cmbIsHidden.Items.IndexOf(cmbIsHidden.Items.FindByValue(Convert.ToString(ds.Tables[0].Rows[0]["IsHidden"])));
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnRemove_Click(object sender, EventArgs e)
    {
        try
        {
            LinkButton btn = (LinkButton)sender;
            hdnSubOptionID.Value = btn.CommandArgument;
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "SELECT IsHidden FROM SubOptions WHERE SubOptionID=@SubOptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("SubOptionID", hdnSubOptionID.Value));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                if (ds.Tables[0].Rows.Count > 0)
                {
                    if (Convert.ToString(ds.Tables[0].Rows[0]["IsHidden"]) == "0")
                    {
                        hdnIsHidden.Value = "0";
                        litAlert.Text = "Please Click Confirm To Draft.";
                    }
                    else
                    {
                        hdnIsHidden.Value = "1";
                        litAlert.Text = "Please Click Confirm To Active.";
                    }
                }
            }
            PopDelete.ShowOnPageLoad = true;
        }
        catch (Exception eX) { }
    }

    protected void btnSave_Click(object sender, EventArgs e)
    {
        try
        {
            string ImageName = string.Empty;
            string ImageFileName = string.Empty;
            Admin_Controls_AdminControls_ProductSubOptionSettings _ProductSubOptionSettings = new Admin_Controls_AdminControls_ProductSubOptionSettings();
            Admin_Controls_AdminControls_ProductSubOptionLevel2 _ProductSubOptionLevel2 = new Admin_Controls_AdminControls_ProductSubOptionLevel2();
            Admin_Controls_AdminControls_ProductSubOptionLevel3 _ProductSubOptionLevel3 = new Admin_Controls_AdminControls_ProductSubOptionLevel3();
            
            string ImageFileID = "";
            if (Session["File"] != null)
            {
                string ErrorIfAny = String.Empty;
                Dictionary<string, string> files = new Dictionary<string, string>();
                files = ((Dictionary<string, string>)Session["File"]);
                if (files.ContainsKey("SubOptionImage"))
                {
                    String NewFilePath = String.Empty;
                    string filePath = files["SubOptionImage"];
                    string BucketName = ConfigurationManager.AppSettings["S3BucketName"];
                    string FolderName = "project-hnm/SubOptions/";
                    ImageFileID = Tools.SaveImage(filePath, BucketName, FolderName, out ErrorIfAny);
                    string err = "";
                    DataSet ds = new DataSet("ds");
                    List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "SELECT * FROM Files WHERE FileID = @FileID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("FileID", ImageFileID));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                    if (Tools.GetData(SQLCommands, out ds, out err))
                    {
                        if (ds.Tables[0].Rows.Count > 0)
                        {
                            ImageFileName = Convert.ToString(ds.Tables[0].Rows[0]["FilePathInServer"]);
                        }
                    }
                }
                Session.Remove("File");
            }
            if (hdnSubOptionID.Value == "-1")
            {
                string err = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = " AddSubOptions @SubOption,@OptionID,@ImageUrl,@IsHidden";
                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                    SqlParameters.Add(new SqlParameter("SubOption", txtSubOption.Text.Trim()));
                    SqlParameters.Add(new SqlParameter("OptionID", cmbCategory.SelectedItem.Value));
                    if (Convert.ToString(ImageFileName) == "" || Convert.ToString(ImageFileName) == null)
                    {
                        SqlParameters.Add(new SqlParameter("ImageUrl", ""));
                    }
                    else
                    {
                        SqlParameters.Add(new SqlParameter("ImageUrl", ImageFileName.ToString()));
                    }
                    SqlParameters.Add(new SqlParameter("IsHidden", cmbIsHidden.SelectedItem.Value));
                    SQLContainer.SqlParameters = SqlParameters;
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    string SSerr = "";
                    DataSet SSds = new DataSet("ds");
                    List<Tools.SqlContainer> SSSQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SSSQLContainer = new Tools.SqlContainer();
                        SSSQLContainer.Query = "AddSubSubOptionBySubOption @SubOptionID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("SubOptionID", ds.Tables[0].Rows[0]["SubOptionID"]));
                        SSSQLContainer.SqlParameters = SqlParameters;
                        SSSQLCommands.Add(SSSQLContainer);
                    }
                    if (Tools.GetData(SSSQLCommands, out SSds, out SSerr))
                    {
                        string L2err = "";
                        DataSet L2ds = new DataSet("ds");
                        List<Tools.SqlContainer> L2SQLCommands = new List<Tools.SqlContainer>();
                        {
                            Tools.SqlContainer L2SQLContainer = new Tools.SqlContainer();
                            L2SQLContainer.Query = "AddSubSubOptionL2BySubSubOption @SubSubOptionID";
                            List<SqlParameter> SqlParameters = new List<SqlParameter>();
                            SqlParameters.Add(new SqlParameter("SubSubOptionID", SSds.Tables[0].Rows[0]["SubsubOptionID"]));
                            L2SQLContainer.SqlParameters = SqlParameters;
                            L2SQLCommands.Add(L2SQLContainer);
                        }
                        if (Tools.GetData(L2SQLCommands, out L2ds, out L2err))
                        {
                            string L3err = "";
                            DataSet L3ds = new DataSet("ds");
                            List<Tools.SqlContainer> L3SQLCommands = new List<Tools.SqlContainer>();
                            {
                                Tools.SqlContainer L3SQLContainer = new Tools.SqlContainer();
                                L3SQLContainer.Query = "AddSubSubOptionL3BySubSubOptionL2 @SubSubOptionL2ID";
                                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                                SqlParameters.Add(new SqlParameter("SubSubOptionL2ID", L2ds.Tables[0].Rows[0]["SubsubOptionL2ID"]));
                                L3SQLContainer.SqlParameters = SqlParameters;
                                L3SQLCommands.Add(L3SQLContainer);
                            }
                            if (Tools.GetData(L3SQLCommands, out L3ds, out L3err))
                            {
                                divGrid.Visible = true;
                                divEditCreate.Visible = false;
                                btnNew.Visible = true;
                                GridProducts.DataBind();
                                txtSubOption.Text = String.Empty;
                                DivtopItems.Visible = true;
                            }
                        }
                    }
                }
            }
            else
            {
                string err = "";
                DataSet ds = new DataSet("ds");
                List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                {
                    if (Convert.ToString(ImageFileName) == "" || Convert.ToString(ImageFileName) == null)
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "UPDATE SubOptions SET SubOption=@SubOption, OptionID=@OptionID, IsHidden=@IsHidden WHERE SubOptionID = @SubOptionID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("SubOption", txtSubOption.Text.Trim()));
                        SqlParameters.Add(new SqlParameter("OptionID", cmbCategory.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("IsHidden", cmbIsHidden.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("SubOptionID", hdnSubOptionID.Value));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                    else
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "UPDATE SubOptions SET SubOption=@SubOption, OptionID=@OptionID, ImageUrl=@ImageUrl, IsHidden=@IsHidden WHERE SubOptionID = @SubOptionID";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("SubOption", txtSubOption.Text.Trim()));
                        SqlParameters.Add(new SqlParameter("OptionID", cmbCategory.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("ImageUrl", ImageFileName.ToString()));
                        SqlParameters.Add(new SqlParameter("IsHidden", cmbIsHidden.SelectedItem.Value));
                        SqlParameters.Add(new SqlParameter("SubOptionID", hdnSubOptionID.Value));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    divGrid.Visible = true;
                    divEditCreate.Visible = false;
                    btnNew.Visible = true;
                    GridProducts.DataBind();
                    txtSubOption.Text = String.Empty;
                    DivtopItems.Visible = true;
                }
            }
        }
        catch (Exception eX) { }
    }

    protected void btnCancel_Click(object sender, EventArgs e)
    {
        try
        {
            divGrid.Visible = true;
            divEditCreate.Visible = false;
            btnNew.Visible = true;
            txtSubOption.Text = String.Empty;
            DivtopItems.Visible = true;
        }
        catch (Exception eX) { }
    }

    protected void BtnDelete_Click(object sender, EventArgs e)
    {
        try
        {
            string err = "";
            DataSet ds = new DataSet("ds");
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UPDATE SubOptions SET IsHidden = @IsHidden WHERE SubOptionID=@SubOptionID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("SubOptionID", hdnSubOptionID.Value));
                if (hdnIsHidden.Value == "0")
                {
                    SqlParameters.Add(new SqlParameter("IsHidden", "1"));
                }
                else
                {
                    SqlParameters.Add(new SqlParameter("IsHidden", "0"));
                }
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.GetData(SQLCommands, out ds, out err))
            {
                PopDelete.ShowOnPageLoad = false;
                GridProducts.DataBind();
            }
        }
        catch (Exception eX) { }
    }

    protected void BtnRemoveCancel_Click(object sender, EventArgs e)
    {
        try
        {
            PopDelete.ShowOnPageLoad = false;
            GridProducts.DataBind();
        }
        catch (Exception eX) { }
    }
}