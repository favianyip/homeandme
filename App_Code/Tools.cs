using System;
using System.Data;
using System.Configuration;
using System.Linq;
using System.Web;
using System.Net;
using System.IO;
using System.Web.Security;
using System.Collections.Generic;
using System.Data.Sql;
using System.Data.SqlClient;
using System.Web.UI;
using System.Web.Script.Serialization;
using System.Web.UI.HtmlControls;
using System.Web.UI.WebControls;
using System.Net.Mail;
using System.Web.UI.WebControls.WebParts;
using System.Xml.Linq;
using MailChimp;
using MailChimp.Types;
using System.Text;
using System.Xml;
using iTextSharp.text.html.simpleparser;
using iTextSharp.text.html;
using iTextSharp.text;
using System.Globalization;
using iTextSharp.text.pdf;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Collections;
using Amazon.S3.Model;
using Amazon.S3;
using Amazon;

public static class Tools
{
    #region Utility Classes
    public static bool ValidateEmail(string email)
    {
        RegexUtilities utilReg = new RegexUtilities();
        return utilReg.IsValidEmail(email);
    }

    public static string GetUrlName(string name, string postfix)
    {
        name = name.Replace(" ", "-").Replace("_", "").Replace("/", "-or-").Replace("\\", "-").Replace("&", "-and-").Replace("%", "-").Replace("@", "-").Replace("$", "-").Replace("(", "-").Replace(")", "-").Replace("=", "-").Replace("!", "-").Replace(":", "-").Replace(";", "-").Replace("{", "-").Replace("}", "-").Replace(".", "").Replace("?", "");
        if (postfix != "")
        {
            name = name + "-" + postfix;
        }
        return name.ToLower();
    }

    public static string GetIP()
    {
        string clientIPAddress = HttpContext.Current.Request.ServerVariables["remote_addr"];
        return clientIPAddress;
    }

    public static string FormatMoney(string value)
    {
        string MoneyValue = "";
        float money;
        float.TryParse(value, out money);
        MoneyValue = String.Format("{0:C2}", money).Replace("$", "");
        MoneyValue = MoneyValue.Replace(".00", "");
        return MoneyValue;
    }
    public static string FormatMoneyWithDecimal(string value)
    {
        string MoneyValue = "";
        float money;
        float.TryParse(value, out money);
        MoneyValue = String.Format("{0:C2}", money).Replace("$", "");
        return MoneyValue;
    }

    public static void setListValue(DropDownList lst, string value)
    {
        int index = -1;
        int cnt = lst.Items.Count;
        for (int i = 0; i < cnt; i++)
        {
            if (lst.Items[i].Value == value)
                index = i;
        }
        lst.SelectedIndex = index;
    }

    public static void CheckInteger(string inputVal, out string outVal)
    {
        int val;
        int val2;
        bool status;
        bool status1;
        if (inputVal.Contains(","))
        {
            string[] str = inputVal.Split(new string[] { "," }, StringSplitOptions.None);
            status = int.TryParse(str[0].Trim(), out val);
            status1 = int.TryParse(str[1].Trim(), out val2);
            if ((status == true) && (status1 == true))
                outVal = val.ToString().Trim() + "," + val2.ToString().Trim();
            else
                outVal = "FALSE";
        }
        else
        {
            status = int.TryParse(inputVal.Trim(), out val);
            if (status == true)
                outVal = val.ToString();
            else
                outVal = "FALSE";
        }
    }

    //Date format for database
    public static string GetDateFormat(DateTime dateValue)
    {
        return dateValue.ToString("yyyy/MM/dd HH:mm:ss");
    }

    public static bool CheckCSV(string name)
    {
        bool value = false;
        string fileExt = name.Substring(name.LastIndexOf(".") + 1, 3);
        if (fileExt.ToLower().Trim() == "csv")
            value = true;
        return value;
    }

    public static void SendMail(string To, string CC, string Subject, string Body, string AttachmentFiles, bool IsBodyHtml)
    {
        try
        {
            MailMessage _Message = new MailMessage();
            string From = ConfigurationManager.AppSettings["FromMailAddress"];
            string reply = ConfigurationManager.AppSettings["ReplyMailAddress"];
            string FromName = ConfigurationManager.AppSettings["FromMailName"];
            string SMTPServerAddress = ConfigurationManager.AppSettings["SMTPServerAddress"];
            string Password = ConfigurationManager.AppSettings["Password"];
            bool ssl = Convert.ToBoolean(ConfigurationManager.AppSettings["SSLPermission"]);
            int SMTPPort = -1;
            int.TryParse(ConfigurationManager.AppSettings["SMTPPort"], out SMTPPort);

            //_Message.From = new MailAddress(From, FromName);
            _Message.From = new MailAddress(From, FromName);

            _Message.To.Add(To);
            if (CC.Trim() != "")
                _Message.Bcc.Add(CC);
            _Message.Subject = Subject;
            _Message.Body = Body;

            // HTML Mail - Mail body should be within html tags.
            _Message.IsBodyHtml = IsBodyHtml;

            // Set priority
            _Message.Priority = MailPriority.Normal;
            _Message.BodyEncoding = System.Text.Encoding.UTF8;

            // Add attachmentes
            if (AttachmentFiles.Trim() != "")
                _Message.Attachments.Add(new Attachment(AttachmentFiles));

            // Create SMTP Client and sent the mail
            SmtpClient _SmtpClient;
            if (SMTPPort == -1)
                _SmtpClient = new SmtpClient(SMTPServerAddress); // if default port
            else
                _SmtpClient = new SmtpClient(SMTPServerAddress, SMTPPort);

            // If using default credintials do not use the below
            //_SmtpClient.UseDefaultCredentials = true;

            // Set the credentials
            System.Net.NetworkCredential basicAuthenticationInfo = new System.Net.NetworkCredential(From, Password);
            _SmtpClient.Credentials = basicAuthenticationInfo;

            _SmtpClient.EnableSsl = ssl;
            _SmtpClient.DeliveryMethod = SmtpDeliveryMethod.Network;

            // Send the mail
            _SmtpClient.Send(_Message);
        }
        catch { }
    }

    public static bool Pushmail(string email, string sub, string body, List<string> attachmentFile)
    {
        bool EmailPushed = false;
        DataSet ds = new DataSet();

        List<Member> emailSubscribers = new List<Member>();
        emailSubscribers.Add(new Member(email));

        if (emailSubscribers.Count > 0)
        {
            List<Mandrill.Messages.SendResult> result = Tools.MandrillEmailSend(HttpUtility.HtmlDecode(sub),
               HttpUtility.HtmlDecode(body),
               ConfigurationManager.AppSettings["FromMailAddress"],
               ConfigurationManager.AppSettings["FromMailName"],
               ConfigurationManager.AppSettings["ReplyMailAddress"],
               ConfigurationManager.AppSettings["ReplyMailName"],
               ConfigurationManager.AppSettings["BccAddress"],
                "", emailSubscribers, attachmentFile);

            //foreach (string files in attachmentFile)
            //{
            //    if (File.Exists(files)) File.Delete(files);

            //}
            foreach (Mandrill.Messages.SendResult sr in result)
            {
                if (sr.Email == email)
                {
                    EmailPushed = true;
                }
            }
        }
        return EmailPushed;
    }

    public static List<Mandrill.Messages.SendResult> MandrillEmailSend(string Subject, string Content, string FromEmail, string FromName, string ReplyEmail, string ReplyName, string BccAddress,
               string emailTags, List<Member> emailSubscribers, List<string> attachmentFilename)
    {
        MailChimp.MandrillApi api = new MandrillApi(ConfigurationManager.AppSettings["MandrillKey"]);
        Mandrill.Messages.Message eMsg = new Mandrill.Messages.Message();
        eMsg.Html = Content;
        eMsg.Subject = Subject;
        eMsg.FromEmail = FromEmail;
        eMsg.FromName = FromName;
        eMsg.BccAddress = BccAddress;
        var attachments = new Mandrill.Messages.Attachment[attachmentFilename.Count];
        int i = 0;
        foreach (string attachment in attachmentFilename)
        {
            if (attachment != "")
            {
                string[] nameArray = attachment.Split('/');
                string fileName = nameArray[nameArray.Length - 1];
                var imageBytes = File.ReadAllBytes(@attachment);
                attachments[i] = new Mandrill.Messages.Attachment("text/csv", fileName, true, Convert.ToBase64String(imageBytes));
                i++;
            }
        }
        eMsg.Attachments = attachments;

        Mandrill.Messages.Header.Create("Reply-To");
        MCDict<Mandrill.Messages.Header> mc = new MCDict<Mandrill.Messages.Header>();
        mc.Add("Reply-To", ReplyEmail);
        eMsg.Headers = mc;
        //eMsg.Headers.Item.Add("Reply-To", ReplyEmail);
        eMsg.PreserveRecipients = false;
        string[] tags = emailTags.Split(',');    // Comma seperated tages should be converted to an array
        eMsg.TrackOpens = true;              // Track if emails were opened by recipients
        eMsg.TrackClicks = true;             // Track if the URLs in mail were clicked
        eMsg.Merge = true;
        int recipientCount = emailSubscribers.Count();
        Mandrill.Messages.Recipient[] recipientList = new Mandrill.Messages.Recipient[recipientCount];  // Receipient List
        Mandrill.Messages.MergeVars[] mergeVarList = new Mandrill.Messages.MergeVars[recipientCount];   // Receipient specific Merge Vars
        Mandrill.NameContentList<string> content = new Mandrill.NameContentList<string>();
        for (int counter = 0; counter < recipientCount; counter++)
        {
            // Add new recipient email and name
            recipientList[counter] = new Mandrill.Messages.Recipient(emailSubscribers[counter].EMAIL, emailSubscribers[counter].FName);

            // Add receipient specific information
            var mergeVars = new Mandrill.NameContentList<string>();
            mergeVars.Add("EMAIL", emailSubscribers[counter].EMAIL.ToString());
            mergeVarList[counter] = new Mandrill.Messages.MergeVars(emailSubscribers[counter].EMAIL, mergeVars);
        }

        eMsg.To = recipientList;
        eMsg.MergeVars = mergeVarList;
        eMsg.AutoHtml = true;
        MVList<Mandrill.Messages.SendResult> result = new MVList<Mandrill.Messages.SendResult>();
        result = api.Send(eMsg);
        return result;
    }

    #endregion

    #region Data Classes

    public struct SqlContainer
    {
        public string Query;
        public List<SqlParameter> SqlParameters;
    }

    public static bool GetData(List<SqlContainer> SqlContainers, out DataSet SelectedData, out string ErrorIfAny)
    {
        int MaxRecords = 0;
        SelectedData = new DataSet();
        ErrorIfAny = string.Empty;
        try
        {
            string ConnectionString = ConfigurationManager.ConnectionStrings["ConnectionString"].ToString();

            // Validate the query string
            if ((SqlContainers == null) || (SqlContainers.Count == 0))
            {
                ErrorIfAny = "Empty select querys";
                return false;
            }

            // Loop through the select quries and retrive the data
            int TableCount = 0;
            foreach (SqlContainer _SqlContainer in SqlContainers)
            {
                string TableName = "Table_" + TableCount.ToString();
                TableCount++;
                SqlDataAdapter _SqlDataAdapter = new SqlDataAdapter();
                _SqlDataAdapter.SelectCommand = new SqlCommand(_SqlContainer.Query, new SqlConnection(ConnectionString));
                if (_SqlContainer.SqlParameters != null)
                {
                    foreach (SqlParameter _SqlParameter in _SqlContainer.SqlParameters)
                    {
                        _SqlDataAdapter.SelectCommand.Parameters.Add(_SqlParameter);
                    }
                }
                _SqlDataAdapter.Fill(SelectedData, 0, MaxRecords, TableName);
                _SqlDataAdapter.Dispose();
            }
            return true;
        }
        catch (Exception eX)
        {
            ErrorIfAny = eX.Message + Environment.NewLine + eX.StackTrace;
            return false;
        }
    }

    //casting for single string
    public static int ExecuteSQL(string CommandSQL, out string ErrorOnFailure)
    {
        string[] SQL = new string[1];
        SQL[0] = CommandSQL;
        return ExecuteSQL(SQL, out ErrorOnFailure);
    }

    //Compile SQL Commands
    public static int ExecuteSQL(string[] CommandSQLs, out string ErrorOnFailure)
    {
        SqlConnection _SqlConnection = null;
        SqlTransaction _SqlTransaction = null;
        ErrorOnFailure = string.Empty;

        try
        {
            string ConnectionString = ConfigurationManager.ConnectionStrings["ConnectionString"].ToString(); ;

            // Validate the query string
            if ((CommandSQLs == null) || (CommandSQLs.Length == 0))
                throw new Exception("Empty command sqls");

            _SqlConnection = new SqlConnection(ConnectionString);
            _SqlConnection.Open();
            _SqlTransaction = _SqlConnection.BeginTransaction();

            // Loop through the select quries and retrive the data
            for (int i = 0; i < CommandSQLs.Length; i++)
            {
                SqlCommand _SqlCommand = new SqlCommand(CommandSQLs[i], _SqlConnection);
                _SqlCommand.Transaction = _SqlTransaction;
                _SqlCommand.ExecuteNonQuery();
            }

            // On success commit transaction
            _SqlTransaction.Commit();

            return 1;
        }
        catch (Exception eX)
        {
            if (_SqlTransaction != null)
                _SqlTransaction.Rollback();

            ErrorOnFailure = eX.Message + Environment.NewLine + eX.StackTrace;
            return -1;
        }
        finally
        {
            try
            {
                if ((_SqlConnection != null) && (_SqlConnection.State == ConnectionState.Open))
                    _SqlConnection.Close();
            }
            catch { }
        }
    }

    public static bool ExecuteSQL(List<SqlContainer> SqlContainers, out string ErrorOnFailure)
    {
        SqlConnection _SqlConnection = null;
        ErrorOnFailure = string.Empty;
        string ConnectionString = ConfigurationManager.ConnectionStrings["ConnectionString"].ToString();
        try
        {
            if ((SqlContainers == null) || (SqlContainers.Count == 0))
            {
                throw new Exception("Empty commands");
            }
            _SqlConnection = new SqlConnection(ConnectionString);
            _SqlConnection.Open();
            foreach (SqlContainer _SqlContainer in SqlContainers)
            {
                SqlCommand _SqlCommand = new SqlCommand(_SqlContainer.Query, _SqlConnection);
                _SqlCommand.CommandTimeout = 600000;
                if (_SqlContainer.SqlParameters != null)
                {
                    foreach (SqlParameter _SqlParameter in _SqlContainer.SqlParameters)
                    {
                        _SqlCommand.Parameters.Add(_SqlParameter);
                    }
                }
                _SqlCommand.ExecuteNonQuery();
            }
            return true;
        }
        catch (Exception eX)
        {
            ErrorOnFailure = eX.Message + Environment.NewLine + eX.StackTrace;
            return false;
        }
        finally
        {
            try
            {
                if ((_SqlConnection != null) && (_SqlConnection.State == ConnectionState.Open))
                {
                    _SqlConnection.Close();
                }
            }
            catch { }
        }
    }

    public static string CompileSQL(string StringToCompile)
    {
        return StringToCompile.Replace("'", "''");
    }

    public static bool GetDataFromRegistrations(List<SqlContainer> SqlContainers, out DataSet SelectedData, out string ErrorIfAny)
    {
        int MaxRecords = 0;
        SelectedData = new DataSet();
        ErrorIfAny = string.Empty;
        try
        {
            string ConnectionString = ConfigurationManager.ConnectionStrings["ConnectionString_Registrations"].ToString();

            // Validate the query string
            if ((SqlContainers == null) || (SqlContainers.Count == 0))
            {
                ErrorIfAny = "Empty select querys";
                return false;
            }

            // Loop through the select quries and retrive the data
            int TableCount = 0;
            foreach (SqlContainer _SqlContainer in SqlContainers)
            {
                string TableName = "Table_" + TableCount.ToString();
                TableCount++;
                SqlDataAdapter _SqlDataAdapter = new SqlDataAdapter();
                _SqlDataAdapter.SelectCommand = new SqlCommand(_SqlContainer.Query, new SqlConnection(ConnectionString));
                if (_SqlContainer.SqlParameters != null)
                {
                    foreach (SqlParameter _SqlParameter in _SqlContainer.SqlParameters)
                    {
                        _SqlDataAdapter.SelectCommand.Parameters.Add(_SqlParameter);
                    }
                }
                _SqlDataAdapter.Fill(SelectedData, 0, MaxRecords, TableName);
                _SqlDataAdapter.Dispose();
            }
            return true;
        }
        catch (Exception eX)
        {
            ErrorIfAny = eX.Message + Environment.NewLine + eX.StackTrace;
            return false;
        }
    }

    #endregion

    #region web classes
    public static string GetRewriteLinkText(string LinkText)
    {
        return LinkText.Replace(" ", "-").Replace("\\", "").Replace("/", "").Replace(".", "").Replace("&", "").Replace(",", "").Replace("?", "").Replace(";", "").Replace(":", "").Replace("@", "");
    }

    private static string addDomianLink(string content)
    {
        if (content.Contains(".png") || content.Contains(".jpg") || content.Contains(".gif") || content.Contains(".bmp") || content.Contains(".PNG") || content.Contains(".JPG") || content.Contains(".GIF") || content.Contains(".BMP"))
        {
            string SourceLink = GetConfigValue(KeyVariables.FCKLink);
            string FinalLink = GetConfigValue(KeyVariables.DomainLink) + GetConfigValue(KeyVariables.FCKLink);
            if (!content.Contains(FinalLink))
                content = content.Replace(GetConfigValue(KeyVariables.FCKLink), GetConfigValue(KeyVariables.DomainLink) + GetConfigValue(KeyVariables.FCKLink));
        }
        return content;
    }
    #endregion

    public static bool checkAdminPermission(string aid, string Permission)
    {
        List<string> permissions = new List<string>();
        permissions = GetAdminPermission(aid);
        foreach (string access in permissions)
        {
            if (Permission == access)
            {
                return true;
            }
        }
        return false;
    }

    public static void triggerPermissionMail(string Permission, string msg)
    {
        string newMsg = "";
        string err = "";
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT AdminUsers.Name, AdminUsers.Email FROM AdminRoles INNER JOIN AdminUsers ON AdminRoles.AdminUserID = AdminUsers.AdminUserID INNER JOIN "
            + "Roles ON AdminRoles.RoleID = Roles.RoleID INNER JOIN RolePermissions ON Roles.RoleID = RolePermissions.RoleID INNER JOIN Permissions ON "
            + "RolePermissions.PermissionID = Permissions.PermissionID WHERE (Permissions.Permission = @Permission)";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("Permission", Permission));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        DataSet ds = new DataSet("ds");
        if (GetData(SQLCommands, out ds, out err))
        {
            for (int i = 0; i < ds.Tables[0].Rows.Count; i++)
            {
                newMsg = "<p>Dear " + ds.Tables[0].Rows[i]["Name"].ToString().Trim() + "</p>" + msg;
                SendMail(ds.Tables[0].Rows[i]["Email"].ToString().Trim(), "", " Administrative Alert!", newMsg, "", true);
            }
        }
    }

    public static bool checkActive(string PageID, string adminID)
    {
        bool check = false;
        string err = "";
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT Status FROM Pages WHERE (PageID = @PageID)";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("PageID", PageID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        DataSet ds = new DataSet("ds");
        if (GetData(SQLCommands, out ds, out err))
        {
            string status = "Draft";
            if (ds.Tables[0].Rows[0]["Status"].ToString().ToUpper().Trim() == "ACTIVE")
            { status = "Active"; }
            if (status == "Active")
            {
                check = Tools.checkAdminPermission(adminID, Tools.PermissionVariables.CMSPublish);
            }
            else
            {
                check = true;
            }
        }
        return check;
    }

    public static bool checkActiveObjects(string objectID, string adminID)
    {
        string err = "";
        string status = "Draft";
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT Pages.Status FROM Pages INNER JOIN PageStructure ON Pages.PageID = PageStructure.PageID WHERE (PageStructure.ArticleID = @ArticleID)";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ArticleID", objectID.Trim()));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (GetData(SQLCommands, out ds, out err))
        {
            for (int i = 0; i < ds.Tables[0].Rows.Count; i++)
            {
                if (ds.Tables[0].Rows[i]["Status"].ToString().ToUpper().Trim() == "ACTIVE")
                    status = "Active";
            }
        }
        if (status == "Active" && Tools.checkAdminPermission(adminID, Tools.PermissionVariables.CMSPublish) == true)
            return true;
        else if (status == "Active" && Tools.checkAdminPermission(adminID, Tools.PermissionVariables.CMSPublish) == false)
            return false;
        else
            return true;
    }

    public static List<string> GetAdminPermission(string aid)
    {
        string err = "";
        List<string> permissions = new List<string>();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT Permissions.Permission FROM AdminRoles INNER JOIN AdminUsers ON AdminRoles.AdminUserID = AdminUsers.AdminUserID INNER JOIN "
            + "Roles ON AdminRoles.RoleID = Roles.RoleID INNER JOIN RolePermissions ON Roles.RoleID = RolePermissions.RoleID INNER JOIN "
            + "Permissions ON RolePermissions.PermissionID = Permissions.PermissionID WHERE (AdminRoles.AdminUserID = @AdminUserID)";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("AdminUserID", aid));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        DataSet ds = new DataSet("ds");
        if (GetData(SQLCommands, out ds, out err))
        {
            foreach (DataRow dr in ds.Tables[0].Rows)
            {
                permissions.Add(dr["Permission"].ToString().Trim());
            }
        }
        return permissions;
    }

    public static void UserLogTrail(string uid, string msg)
    {
        string err = "";
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "Insert Into UsersLogTrail (UserID, ActionDescription, IPAddress) Values (@UserID, @ActionDescription, @IPAddress)";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("UserID", uid));
            SqlParameters.Add(new SqlParameter("ActionDescription", msg));
            SqlParameters.Add(new SqlParameter("IPAddress", GetIP()));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        ExecuteSQL(SQLCommands, out err);
    }

    public static void AdminLogTrail(string aid, string msg)
    {
        string err = "";
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "INSERT INTO AdminLogTrail (AdminUserID, ActionDescription, IPAddress) Values (@AdminUserID, @ActionDescription, @IPAddress)";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("AdminUserID", aid));
            SqlParameters.Add(new SqlParameter("ActionDescription", msg));
            SqlParameters.Add(new SqlParameter("IPAddress", GetIP()));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        Tools.ExecuteSQL(SQLCommands, out err);
    }

    public static void insertVersions(string ArticleLanguageID, string adminID)
    {
        string err = "";
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "CreateArticleVersion @ArticleLanguageID, @AdminUserID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ArticleLanguageID", ArticleLanguageID));
            SqlParameters.Add(new SqlParameter("AdminUserID", adminID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        ExecuteSQL(SQLCommands, out err);
        SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "UpdateArticlesExternalLinks @ArticleLanguageID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ArticleLanguageID", ArticleLanguageID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        ExecuteSQL(SQLCommands, out err);
    }

    public static void customizeUser(string id, out string name)
    {
        string err = "";
        name = "Customer";
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "Select * From Users Where UserID = @UserID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("UserID", id));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        DataSet ds = new DataSet("ds");
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            name = ds.Tables[0].Rows[0]["GivenName"].ToString().Trim();
        }
    }

    public static string GetConfigValue(string key)
    {
        string value = "";
        string err = "";
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "Select ConfigValue From Config Where ConfigKey=@ConfigKey";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ConfigKey", key));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        DataSet ds = new DataSet("ds");
        if (GetData(SQLCommands, out ds, out err))
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                value = ds.Tables[0].Rows[0]["ConfigValue"].ToString().Trim();
            }
        }
        return value;
    }

    public static string GetPageSatus(string pageID)
    {
        string status = "active";
        string err = "";
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT Status FROM Pages WHERE PageID = @PageID)";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("PageID", pageID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            status = ds.Tables[0].Rows[0][0].ToString().ToLower().Trim();
        }
        return status;
    }

    public static void GetEmailTemplate(string Key, out string Subject, out string Body)
    {
        Body = "";
        Subject = "";
        string ErrorIfAny = string.Empty;
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "Select EmailBody, EmailSubject FROM [EmailConfig] WHERE EmailKey = @EmailKey";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("EmailKey", Key));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        DataSet DS = new DataSet();
        if (Tools.GetData(SQLCommands, out DS, out ErrorIfAny))
        {
            if (DS.Tables[0].Rows.Count > 0)
            {
                Body = HttpUtility.HtmlDecode(DS.Tables[0].Rows[0]["EmailBody"].ToString().Trim());
                Subject = DS.Tables[0].Rows[0]["EmailSubject"].ToString().Trim();
            }
        }
    }

    public static string GetPageURLName(string PageName)
    {
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT PageURLName FROM Pages WHERE PageName = @PageName";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("PageName", PageName));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        string err = "";
        DataSet ds = new DataSet();
        if (GetData(SQLCommands, out ds, out err))
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                return ds.Tables[0].Rows[0]["PageURLName"].ToString().Trim();
            }
        }
        return null;
    }

    public static string GetFieldName(string id, string TableName, string FieldName, string Filter)
    {
        string name = id;
        string err = "";
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT " + FieldName + " FROM " + TableName + " WHERE " + Filter + " =  @" + Filter + "";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter(Filter, id));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            name = ds.Tables[0].Rows[0][0].ToString().Trim();
        }
        return name;
    }

    public static string GeneratePassword()
    {
        int length = 8;
        string allowedChars = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNOPQRSTUVWXYZ023456789";
        Random randNum = new Random();
        char[] chars = new char[length];
        int allowedCharCount = allowedChars.Length;
        for (int i = 0; i < length; i++)
            chars[i] = allowedChars[(int)((allowedChars.Length) * randNum.NextDouble())];
        return new string(chars);
    }

    public static DataTable GetTableData(string TableName, string TextField, string ValueField, bool IsSortOrderExist)
    {
        DataTable dt = new DataTable();
        string err = "";
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            string Query = "";
            if (IsSortOrderExist)
            {
                Query = "(SELECT 0 AS ValueField,'Select' AS TextField, 0 AS SortOrder) UNION SELECT " + ValueField + ", " + TextField + ", SortOrder FROM " + TableName;
            }
            else
            {
                Query = "(SELECT 0 AS ValueField,'Select' AS TextField) UNION SELECT " + ValueField + ", " + TextField + " FROM " + TableName;
            }

            if (IsSortOrderExist) Query += " ORDER BY SortOrder";
            SQLContainer.Query = Query;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            dt = ds.Tables[0];
        }
        return dt;
    }

    public static void AddSignInLog(string MemberID)
    {
        string err = "";
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "AddSignInLog @MemberID, @IPAddress";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("MemberID", MemberID));
            SqlParameters.Add(new SqlParameter("IPAddress", GetIP()));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        DataSet ds = new DataSet("ds");
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
        }
    }

    public static DataTable GetDateRangeForFilter()
    {
        DataTable dt = new DataTable();
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "GetDateRangeForFilter";
            SQLCommands.Add(SQLContainer);
        }
        string err = "";
        DataSet ds = new DataSet();
        if (GetData(SQLCommands, out ds, out err))
        {
            if (ds.Tables.Count > 0)
            {
                dt = ds.Tables[0];
            }
        }
        return dt;
    }

    public static class PermissionVariables
    {
        public static string CMSCreateUpdate = "CMS - Create/Update Content";
        public static string CMSPublish = "CMS - Publish Content";
        public static string MemberManageProfiles = "Member - Manage Profiles";
        public static string MemberViewProfiles = "Member - View Profiles";
        public static string OthersManageFeedback = "Others -  Manage Feedback";
        public static string OthersManageSecurity = "Others - Manage Security";
        public static string OthersViewWebStatistics = "Others - View Web Statistics";
        public static string Members_Listing = "Members Listing";
        public static string Subscribers_Listing = "Subscribers Listing";
        public static string Feedback_Listing = "Feedback Listing";
        public static string Manage_Admin_Users = "Manage Admin Users";
        public static string Manage_Admin_Roles = "Manage Admin Roles";
        public static string Email_Configuration = "Email Configuration";
    }

    [Serializable]
    public static class SessionVariables
    {
        public static string LockScreenStatus = "LockScreenStatus";
        public static string LanguageID = "LanguageID";
        public static string AuthorisationID = "AuthorisationID";
        public static string IsInitialLoad = "IsInitialLoad";
        public static string AdminUserID = "AdminUserID";
        public static string UserID = "userid";
        public static string MemberID = "MemberID";

        public static string LoginUserName = "LoginUserName";
        public static string LoginUserGendeID = "LoginUserGendeID";
        public static string LoginUserStatus = "LoginUserStatus";
        public static string SignUpUserStage = "SignUpUserStage";
        public static string OtherProfileID = "OtherProfileID";

        public static string LoginUserEmail = "LoginUserEmail";
        public static string LoginUserPhone = "LoginUserPhone";
        public static string SelectedGift = "SelectedGift";
        public static string FromDate = "FromDate";
        public static string ToDate = "ToDate";
        public static string SelectedTimePeriod = "SelectedTimePeriod";
        public static string ShowDataPoints = "ShowDataPoints";
        public static string LoginUserID = "LoginUserID";
        public static string CurrentURL = "CurrentURL";
        public static string EditUserID = "EditUserID";
        public static string SelectedTimePeriodFrom = "SelectedTimePeriodFrom";
        public static string SelectedTimePeriodTo = "SelectedTimePeriodTo";
        public static string PurchaseOrderID = "PurchaseOrderID";
        public static string OrderID = "OrderID";
    }

    public static class KeyVariables
    {
        public static string SelectionYear = "SelectionYear";
        public static string BannerURL = "BannerURL";
        public static string BannerImage = "BannerImage";
        public static string BackupToken = "BackupToken";
        public static string CustomerServiceNumber = "CustomerServiceNumber";
        public static string URLReplacementTag = "URLReplacementTag";
        public static string RHome = "Redirect_Home";
        public static string RedirectLoadingPage = "RedirectLoadingPage";
        public static string StratagileEmail = "StratagileEmail";
        public static string StratagileNumber = "StratagileNumber";
        public static string FeedBackName = "FeedBackName";
        public static string DomainLink = "DomainLink";
        public static string FCKLink = "FCKLink";
        public static string ProfileDATETIME = "ProfileDATETIME";
        public static string ProfileNAME = "ProfileNAME";
        public static string AdminEmail = "AdminEmail";
        public static string UTM_Source = "UTM_Source";
        public static string UTM_Medium = "UTM_Medium";
        public static string UTM_Campaign = "UTM_Campaign";
        public static string UTM_Term = "UTM_Term";
        public static string UTM_Content = "UTM_Content";
        public static string UserName = "UserName";
        public static string Password = "Password";
        public static string AdminLogPeriod = "AdminLogPeriod";
        public static string CompanyID = "CompanyID";
        public static string RNotFound = "Redirect_NotFound";
        public static string RExpired = "Redirect_Expired";
        public static string RError = "Redirect_Error";
        public static string ProfileEMAIL = "ProfileEMAIL";
        public static string FEMAIL = "FEMAIL";
        public static string FSUBJECT = "FSUBJECT";
        public static string FMESSAGE = "FMESSAGE";
        public static string SiteTitle = "SiteTitle";
        public static string CompanyName = "CompanyName";
        public static string Subject = "Subject";
        public static string AdminSubject = "AdminSubject";
        public static string Link = "Link";
        public static string LoadingPage = "LoadingPage";
        public static string BaseUrl = "BaseUrl";
        public static string HighResWidth = "HighResWidth";
        public static string HighResHeight = "HighResHeight";
        public static string LowResWidth = "LowResWidth";
        public static string LowResHeight = "LowResHeight";
        public static string ListViewWidth = "ListViewWidth";
        public static string ListViewHeight = "ListViewHeight";
        public static string ThumbnailWidth = "ThumbnailWidth";
        public static string ThumbnailHeight = "ThumbnailHeight";

        public static string S3Key = "S3Key";
        public static string S3Secret = "S3Secret";
        public static string S3Url = "S3Url";
        public static string S3Root = "S3Root";
    }

    public static void Show(string message)
    {
        // Cleans the message to allow single quotation marks
        string cleanMessage = message.Replace("'", "\\'");
        string script = "<script type=\"text/javascript\">alert('" + cleanMessage + "');</script>";

        // Gets the executing web page
        Page page = HttpContext.Current.CurrentHandler as Page;

        // Checks if the handler is a Page and that the script isn't allready on the Page
        if (page != null && !page.ClientScript.IsClientScriptBlockRegistered("alert"))
        {
            page.ClientScript.RegisterClientScriptBlock(typeof(Tools), "alert", script);
        }
    }

    public static byte[] imageToByteArray(System.Drawing.Image imageIn)
    {
        MemoryStream ms = new MemoryStream();
        imageIn.Save(ms, System.Drawing.Imaging.ImageFormat.Bmp);
        return ms.ToArray();
    }

    static IAmazonS3 client;

    public static string SaveImage(string NewFilePath, string BucketName, string FolderName, out string err)
    {
        string id = "";
        err = "";
        try
        {
            string filePath = UploadImage(NewFilePath, BucketName, FolderName);

            string saveName = NewFilePath.Substring(NewFilePath.LastIndexOf(@"\") + 1);
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "INSERT INTO Files ([FilePathInServer],[OriginalFileName]) VALUES (@FilePathInServer, @OriginalFileName)";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("FilePathInServer", filePath));
                SqlParameters.Add(new SqlParameter("OriginalFileName", saveName));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.ExecuteSQL(SQLCommands, out err))
            {
                DataSet ds = new DataSet("ds");
                SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "SELECT MAX(FileID) AS ID FROM Files";
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    err = "";
                    id = ds.Tables[0].Rows[0][0].ToString().Trim();
                }
            }
        }
        catch { }
        return id;
    }

    public static string UploadImage(string NewFilePath, string BucketName, string FolderName)
    {
        string filepath = "";
        try
        {
            filepath = UploadImagewithLocalCopy(NewFilePath, BucketName, FolderName);
            File.Delete(NewFilePath);
        }
        catch { }
        return filepath;
    }

    public static string UploadImagewithLocalCopy(string NewFilePath, string BucketName, string FolderName)
    {
        string filepath = "";
        try
        {
            string saveName = NewFilePath.Substring(NewFilePath.LastIndexOf(@"\") + 1);
            using (client = new AmazonS3Client(ConfigurationManager.AppSettings["S3AccessKeyID"], ConfigurationManager.AppSettings["S3SecretAccessKey"], RegionEndpoint.APSoutheast1))
            {
                PutObjectRequest request = new PutObjectRequest()
                {
                    BucketName = BucketName,
                    Key = FolderName + saveName,
                    FilePath = NewFilePath
                };
                request.CannedACL = Amazon.S3.S3CannedACL.PublicRead;
                PutObjectResponse response2 = client.PutObject(request);
            }
            filepath = GetConfigValue(KeyVariables.S3Url).Replace("[FOLDERNAME]", BucketName) + FolderName + saveName;
        }
        catch (Exception eX)
        {
        }
        return filepath;
    }

    public static string SaveImage(string NewFilePath, string BucketName, out string err)
    {
        string id = "";
        err = "";
        try
        {
            string filePath = UploadImage(NewFilePath, BucketName);

            string saveName = NewFilePath.Substring(NewFilePath.LastIndexOf(@"\") + 1);
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "INSERT INTO Files ([FilePathInServer],[OriginalFileName]) VALUES (@FilePathInServer, @OriginalFileName)";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("FilePathInServer", filePath));
                SqlParameters.Add(new SqlParameter("OriginalFileName", saveName));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.ExecuteSQL(SQLCommands, out err))
            {
                DataSet ds = new DataSet("ds");
                SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "SELECT MAX(FileID) AS ID FROM Files";
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    err = "";
                    id = ds.Tables[0].Rows[0][0].ToString().Trim();
                }
            }
        }
        catch { }
        return id;
    }

    public static string UploadImage(string NewFilePath, string BucketName)
    {
        string filepath = "";
        try
        {
            filepath = UploadImagewithLocalCopy(NewFilePath, BucketName);
            File.Delete(NewFilePath);
        }
        catch { }
        return filepath;
    }

    public static string UploadImagewithLocalCopy(string NewFilePath, string BucketName)
    {
        string filepath = "";
        try
        {
            string saveName = NewFilePath.Substring(NewFilePath.LastIndexOf(@"\") + 1);
            using (client = new AmazonS3Client(ConfigurationManager.AppSettings["S3AccessKeyID"], ConfigurationManager.AppSettings["S3SecretAccessKey"], RegionEndpoint.APSoutheast1))
            {
                PutObjectRequest request = new PutObjectRequest()
                {
                    BucketName = BucketName,
                    Key = saveName,
                    FilePath = NewFilePath
                };
                request.CannedACL = Amazon.S3.S3CannedACL.PublicRead;
                PutObjectResponse response2 = client.PutObject(request);
            }
            filepath = "https://castrolimages.s3.ap-southeast-1.amazonaws.com/" + saveName;
        }
        catch (Exception eX)
        {
        }
        return filepath;
    }

    public static int GetAvailableQty(string plid)
    {
        int qty = 0;
        string err = "";
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "GetProductAvalability @ProductLineID ";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ProductLineID", plid));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        DataSet ds = new DataSet("ds");
        Tools.GetData(SQLCommands, out ds, out err);
        if (ds.Tables[0].Rows.Count > 0)
        {
            int.TryParse(ds.Tables[0].Rows[0][0].ToString().Trim(), out qty);
        }
        return qty;
    }

    public static bool AddItemToCart(string Quantity, string ProductLineID, string SessionID, string CustomerID, string edit, string ShowroomID, out string error)
    {
        error = "";
        string err = "";
        DataSet ds = new DataSet("ds");
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "ClearCart";
            SQLCommands.Add(SQLContainer);
        }
        Tools.ExecuteSQL(SQLCommands, out err);
        int newQty = 1;
        int qty = 0;
        int.TryParse(Quantity, out newQty);
        SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT Quantity FROM Cart WHERE ProductLineID = @ProductLineID AND CustomerID = @CustomerID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ProductLineID", ProductLineID));
            SqlParameters.Add(new SqlParameter("CustomerID", CustomerID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        ds = new DataSet("ds");
        Tools.GetData(SQLCommands, out ds, out err);
        if (ds.Tables[0].Rows.Count > 0)
        {
            int.TryParse(ds.Tables[0].Rows[0][0].ToString().Trim(), out qty);
        }
        if (Tools.GetAvailableQty(ProductLineID) < newQty)
        {
            error = "Sorry, The product with mentioned quantity is out of stock.";
            return false;
        }
        SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "UpdateCartDetails @ProductLineID, @Quantity, @SessionID, @CustomerID,@edit,@ShowroomID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("ProductLineID", ProductLineID));
            SqlParameters.Add(new SqlParameter("Quantity", newQty));
            SqlParameters.Add(new SqlParameter("SessionID", SessionID));
            SqlParameters.Add(new SqlParameter("CustomerID", CustomerID));
            SqlParameters.Add(new SqlParameter("edit", edit));
            SqlParameters.Add(new SqlParameter("ShowroomID", ShowroomID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
            }
        }
        else
        {
            error = err;
            return false;
        }
        return true;
    }

    public static string ProcessCart(string CartID, string POID, out string error)
    {
        error = "";
        string err = "";
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "SELECT * FROM Cart WHERE CartID = @CartID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("CartID", CartID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        DataSet ds = new DataSet("ds");
        Tools.GetData(SQLCommands, out ds, out err);
        if (ds.Tables[0].Rows.Count == 0)
        {
            error = "Your shopping cart is empty, please select items you want to purchase to proceed. Thank you.";
            return "";
        }
        SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "[CreateOrder] @CartID, @CustomerID, @POID";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("CartID", CartID));
            SqlParameters.Add(new SqlParameter("CustomerID", HttpContext.Current.Session[Tools.SessionVariables.UserID].ToString().Trim()));
            SqlParameters.Add(new SqlParameter("POID", POID));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            string id = "";
            if (ds.Tables[0].Rows.Count > 0)
            {
                id = ds.Tables[0].Rows[0][0].ToString().Trim();
            }
            return POID;
        }
        else
        {
            error = "Error found, please try again.";
            return "";
        }
    }

    public static string GetEmailBody(string key, out string subject)
    {
        string body = "";
        subject = "";
        string err = "";
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = "Select EmailValue, Subject FROM [EmailConfig] WHERE EmailKey = @EmailKey";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("EmailKey", key));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        DataSet ds = new DataSet("ds");
        if (Tools.GetData(SQLCommands, out ds, out err))
        {
            if (ds.Tables[0].Rows.Count > 0)
            {
                body = HttpUtility.HtmlDecode(ds.Tables[0].Rows[0]["EmailValue"].ToString().Trim());
                subject = ds.Tables[0].Rows[0]["Subject"].ToString().Trim();
            }
        }
        return body;
    }

    public static void EmailLogTrail(string ToEmail, string Subject, string Body, string Attachment1, string Attachment2)
    {
        string err = "";
        List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
        {
            Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
            SQLContainer.Query = " [SetEmailLog] @Email, @Subject, @Bcc, @Cc, @Body, @Attachment1, @Attachment2, @Attachment3, @Source, @IsSuccess";
            List<SqlParameter> SqlParameters = new List<SqlParameter>();
            SqlParameters.Add(new SqlParameter("Email", ToEmail));
            SqlParameters.Add(new SqlParameter("Subject", Subject));
            SqlParameters.Add(new SqlParameter("Bcc", ConfigurationManager.AppSettings["BccAddress"]));
            SqlParameters.Add(new SqlParameter("Cc", ""));
            SqlParameters.Add(new SqlParameter("Body", Body));
            SqlParameters.Add(new SqlParameter("Attachment1", Attachment1));
            SqlParameters.Add(new SqlParameter("Attachment2", Attachment2));
            SqlParameters.Add(new SqlParameter("Attachment3", ""));
            SqlParameters.Add(new SqlParameter("Source", ""));
            SqlParameters.Add(new SqlParameter("IsSuccess", true));
            SQLContainer.SqlParameters = SqlParameters;
            SQLCommands.Add(SQLContainer);
        }
        ExecuteSQL(SQLCommands, out err);
    }

    public static int InsertPayment(int paymentMethod, decimal PaidAmount, int ProjectID, int TypeOfPayment)
    {
        int paymentID = 0;
        string err = "";
        try
        {
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "INSERT INTO Payments (PaymentMethod, PaidAmount, ProjectID, TypeOfPayment) VALUES (@PaymentMethod, @PaidAmount, @ProjectID, @TypeOfPayment)";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("PaymentMethod", paymentMethod));
                SqlParameters.Add(new SqlParameter("PaidAmount", PaidAmount));
                SqlParameters.Add(new SqlParameter("ProjectID", ProjectID));
                SqlParameters.Add(new SqlParameter("TypeOfPayment", TypeOfPayment));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            if (Tools.ExecuteSQL(SQLCommands, out err))
            {
                DataSet ds = new DataSet("ds");
                SQLCommands = new List<Tools.SqlContainer>();
                {
                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                    SQLContainer.Query = "SELECT MAX(PaymentID) AS ID FROM Payments";
                    SQLCommands.Add(SQLContainer);
                }
                if (Tools.GetData(SQLCommands, out ds, out err))
                {
                    err = "";
                    paymentID = Convert.ToInt32(ds.Tables[0].Rows[0][0].ToString().Trim());
                }
            }
        }
        catch { }
        return paymentID;
    }

    public static void UpdatePayment(string TransactionID, string IPN_Parameters, int paymentID)
    {
        string err = "";
        try
        {
            List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
            {
                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                SQLContainer.Query = "UPDATE Payments SET TransactionID = @TransactionID ,IPN_Parameters = @IPN_Parameters, Status = @Status WHERE PaymentID = @PaymentID";
                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                SqlParameters.Add(new SqlParameter("TransactionID", TransactionID));
                SqlParameters.Add(new SqlParameter("IPN_Parameters", IPN_Parameters));
                SqlParameters.Add(new SqlParameter("Status", "2"));
                SqlParameters.Add(new SqlParameter("PaymentID", paymentID));
                SQLContainer.SqlParameters = SqlParameters;
                SQLCommands.Add(SQLContainer);
            }
            Tools.ExecuteSQL(SQLCommands, out err);
        }
        catch(Exception ex) { }
    }

    public static int GetData(string SelectQuerys, out DataSet SelectedData, out string ErrorOnFailure)
    {
        string[] SQL = new string[1];
        SQL[0] = SelectQuerys;
        return GetData(SQL, out SelectedData, out ErrorOnFailure);
    }

    public static int GetData(string[] SelectQuerys, out DataSet SelectedData, out string ErrorOnFailure)
    {
        int MaxRecords = 0;
        SelectedData = new DataSet();
        ErrorOnFailure = string.Empty;
        try
        {
            string ConnectionString = ConfigurationManager.ConnectionStrings["ConnectionString"].ToString();

            // Validate the query string
            if ((SelectQuerys == null) || (SelectQuerys.Length == 0))
                throw new Exception("Empty select querys");

            // Loop through the select quries and retrive the data
            for (int i = 0; i < SelectQuerys.Length; i++)
            {
                string TableName = "Table_" + i.ToString();
                SqlDataAdapter _SqlDataAdapter = new SqlDataAdapter(SelectQuerys[i], ConnectionString);
                _SqlDataAdapter.Fill(SelectedData, 0, MaxRecords, TableName);
                _SqlDataAdapter.Dispose();
            }
            return 1;
        }
        catch (Exception eX)
        {
            ErrorOnFailure = eX.Message + Environment.NewLine + eX.StackTrace;
            return -1;
        }
    }

    public static int ExecuteSQL_DML(string sql, bool isUpdate)
    {
        SqlConnection _SqlConnection = null;
        SqlCommand cmd;

        string ConnectionString = ConfigurationManager.ConnectionStrings["ConnectionString"].ToString();
        _SqlConnection = new SqlConnection(ConnectionString);
        try
        {
            _SqlConnection.Open();
            cmd = new SqlCommand(sql, _SqlConnection);
            int returnVal = cmd.ExecuteNonQuery();
            cmd.Dispose();
            return returnVal;
        }
        catch (Exception eX)
        {
            return 0;
        }
        finally
        {
            try
            {
                if ((_SqlConnection != null) && (_SqlConnection.State == ConnectionState.Open))
                {
                    _SqlConnection.Close();
                }
            }
            catch { }
        }
    }
}



