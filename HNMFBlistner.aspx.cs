using System;
using System.Collections.Generic;
using System.Configuration;
using System.Data;
using System.Data.SqlClient;
using System.IO;
using System.Linq;
using System.Net;
using System.Text;
using System.Web;
using System.Web.Script.Serialization;
using System.Web.UI;
using System.Web.UI.WebControls;

public partial class HNMFBlistner : System.Web.UI.Page
{
    string FacebookClientID = ConfigurationManager.AppSettings["FacebookClientID"].ToString();
    string FacebookClientSecretKey = ConfigurationManager.AppSettings["FacebookClientSecretKey"].ToString();
    string Redirection_URL = ConfigurationManager.AppSettings["FacebookRedirectUrl"].ToString();
    string AuthUrl = ConfigurationManager.AppSettings["FacebookAuthUrl"].ToString();
    string ErrorIfAny = String.Empty;
    protected void Page_Load(object sender, EventArgs e)
    {
        if (!IsPostBack)
        {
            if (Request.QueryString["code"] != null)
            {
                GetToken(Request.QueryString["code"].ToString());
            }
        }
    }


    public void GetToken(string Code)
    {
        try
        {
            string PostString = string.Format("client_id={0}&redirect_uri={1}&client_secret={2}&code={3}", FacebookClientID, Redirection_URL, FacebookClientSecretKey, Code);
            var request = (HttpWebRequest)WebRequest.Create(AuthUrl);
            request.ContentType = "application/x-www-form-urlencoded";
            request.Method = "POST";
            UTF8Encoding utfenc = new UTF8Encoding();
            byte[] bytes = utfenc.GetBytes(PostString);
            Stream outputstream = null;
            try
            {
                request.ContentLength = bytes.Length;
                outputstream = request.GetRequestStream();
                outputstream.Write(bytes, 0, bytes.Length);
            }
            catch (Exception ex) { }
            var response = (HttpWebResponse)request.GetResponse();
            var streamReader = new StreamReader(response.GetResponseStream());
            string responseFromServer = streamReader.ReadToEnd();
            JavaScriptSerializer js = new JavaScriptSerializer();
            Tokenclass obj = js.Deserialize<Tokenclass>(responseFromServer);
            Session["FBUserCode"] = obj.Access_Token;
            GetUserProfile(obj.Access_Token);
        }
        catch (Exception ex) { }
    }

    public void GetUserProfile(string AccessToken)
    {
        try
        {
            string Url = string.Format("https://graph.facebook.com/me?access_token={0}&fields=first_name,last_name,name_format,picture,short_name,name,email", AccessToken);
            string FacebookToken = string.Empty;
            string redirecturl = string.Empty;
            WebRequest request = WebRequest.Create(Url);
            request.Credentials = CredentialCache.DefaultCredentials;
            WebResponse response = request.GetResponse();
            Stream dataStream = response.GetResponseStream();
            StreamReader reader = new StreamReader(dataStream);
            string responseFromServer = reader.ReadToEnd();
            reader.Close();
            response.Close();
            JavaScriptSerializer js = new JavaScriptSerializer();
            FaceBookUserProfile UserInfo = js.Deserialize<FaceBookUserProfile>(responseFromServer);
            if (UserInfo != null)
            {
                string fbemail = UserInfo.Email;
                if (fbemail == null)
                {
                    Session["fbid"] = UserInfo.ID;
                    Session["fbfname"] = UserInfo.First_Name;
                    Session["fblname"] = UserInfo.Last_Name;
                    Session["fbfullname"] = UserInfo.Name;
                    Session["fbpictureurl"] = UserInfo.Picture.Data.Url;
                    Session["fbnameformat"] = UserInfo.Name_Format;
                    Session["fbshortname"] = UserInfo.Short_Name;
                    Session["fbpicheight"] = UserInfo.Picture.Data.Height;
                    Session["fbpicwidth"] = UserInfo.Picture.Data.Width;

                    Response.Redirect("SocialRegisterAccount.aspx");
                }
                else
                {
                    lblId.Text = UserInfo.ID;
                    FacebookToken = UserInfo.ID;
                    lblFirstName.Text = UserInfo.First_Name;
                    lblLastName.Text = UserInfo.Last_Name;
                    lblName.Text = UserInfo.Name;
                    lblEmail.Text = UserInfo.Email;
                    ProfileImage.ImageUrl = UserInfo.Picture.Data.Url;
                    lblNameFormat.Text = UserInfo.Name_Format;
                    lblShortName.Text = UserInfo.Short_Name;
                    lblPictureHeight.Text = UserInfo.Picture.Data.Height;
                    lblPictureWidth.Text = UserInfo.Picture.Data.Width;
                    Session["UserName"] = UserInfo.Name;
                    Session["UserEmail"] = UserInfo.Email;
                    string Email = Session["UserEmail"].ToString();
                    List<Tools.SqlContainer> SQLCommands = new List<Tools.SqlContainer>();
                    {
                        Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                        SQLContainer.Query = "CheckUserInSocialMediaLogin @Email , @LoginVia";
                        List<SqlParameter> SqlParameters = new List<SqlParameter>();
                        SqlParameters.Add(new SqlParameter("Email", UserInfo.Email.ToString()));
                        SqlParameters.Add(new SqlParameter("LoginVia", "1"));
                        SQLContainer.SqlParameters = SqlParameters;
                        SQLCommands.Add(SQLContainer);
                    }
                    DataSet ds = new DataSet();
                    if (Tools.GetData(SQLCommands, out ds, out ErrorIfAny))
                    {
                        if (ds.Tables[0].Rows.Count == 0)
                        {
                            List<Tools.SqlContainer> SQLCommandsInsert = new List<Tools.SqlContainer>();
                            {
                                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                                SQLContainer.Query = "UserRegisterViaSocialMedia @SocialID, @FirstName, @LastName, @Email, @FullName, @NameFormat, @ShortName, @ProfilePicture, @PictureHeight, @PictureWidth, @LoginVia";
                                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                                SqlParameters.Add(new SqlParameter("SocialID", UserInfo.ID.ToString()));
                                SqlParameters.Add(new SqlParameter("FirstName", UserInfo.First_Name.ToString()));
                                SqlParameters.Add(new SqlParameter("LastName", UserInfo.Last_Name.ToString()));
                                SqlParameters.Add(new SqlParameter("Email", UserInfo.Email.ToString()));
                                SqlParameters.Add(new SqlParameter("FullName", UserInfo.Name.ToString()));
                                SqlParameters.Add(new SqlParameter("NameFormat", UserInfo.Name_Format.ToString()));
                                SqlParameters.Add(new SqlParameter("ShortName", UserInfo.Short_Name.ToString()));
                                SqlParameters.Add(new SqlParameter("ProfilePicture", UserInfo.Picture.Data.Url.ToString()));
                                SqlParameters.Add(new SqlParameter("PictureHeight", UserInfo.Picture.Data.Height.ToString()));
                                SqlParameters.Add(new SqlParameter("PictureWidth", UserInfo.Picture.Data.Width.ToString()));
                                SqlParameters.Add(new SqlParameter("LoginVia", "1"));
                                SQLContainer.SqlParameters = SqlParameters;
                                SQLCommandsInsert.Add(SQLContainer);
                            }
                            DataSet dsInsert = new DataSet();
                            Tools.GetData(SQLCommandsInsert, out dsInsert, out ErrorIfAny);
                            string ReferenceKey = String.Empty;
                            int num = new Random().Next(1000, 9999);
                            ReferenceKey = Convert.ToString(num);
                            string Password = "HNMPassword123!";
                            string EncryptedPassword = Cryptography_RijndaelManaged.Encrypt(Password.Trim());
                            List<Tools.SqlContainer> SQLCommandsInsertUser = new List<Tools.SqlContainer>();
                            {
                                Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                                SQLContainer.Query = "CreateUserRegistrationViaSocialMedia @Name, @Email ,@EncryptedPassword, @ReferenceKey, @FacebookToken";
                                List<SqlParameter> SqlParameters = new List<SqlParameter>();
                                SqlParameters.Add(new SqlParameter("Name", UserInfo.Name.ToString()));
                                SqlParameters.Add(new SqlParameter("Email", UserInfo.Email.ToString()));
                                SqlParameters.Add(new SqlParameter("EncryptedPassword", EncryptedPassword));
                                SqlParameters.Add(new SqlParameter("ReferenceKey", ReferenceKey));
                                SqlParameters.Add(new SqlParameter("FacebookToken", FacebookToken));
                                SQLContainer.SqlParameters = SqlParameters;
                                SQLCommandsInsertUser.Add(SQLContainer);
                            }
                            DataSet dsInsertUser = new DataSet();
                            if (Tools.GetData(SQLCommandsInsertUser, out dsInsertUser, out ErrorIfAny))
                            {
                                if (dsInsertUser.Tables.Count > 0)
                                {
                                    Session["UserID"] = dsInsertUser.Tables[0].Rows[0]["UserID"].ToString();
                                    string UserID = Session["UserID"].ToString();
                                    ProcessLogin(UserID);
                                }
                            }
                        }
                        else  // User exist with Social media email
                        {
                            {
                                List<Tools.SqlContainer> SQLCommandUser = new List<Tools.SqlContainer>();
                                {
                                    Tools.SqlContainer SQLContainer = new Tools.SqlContainer();
                                    SQLContainer.Query = "CheckIfUserExist @Email";
                                    List<SqlParameter> SqlParameters = new List<SqlParameter>();
                                    SqlParameters.Add(new SqlParameter("Email", Email));
                                    SQLContainer.SqlParameters = SqlParameters;
                                    SQLCommandUser.Add(SQLContainer);
                                }
                                ds = new DataSet();
                                if (Tools.GetData(SQLCommandUser, out ds, out ErrorIfAny))
                                {
                                    if (ds.Tables.Count > 0)
                                    {
                                        Session["UserID"] = ds.Tables[0].Rows[0]["UserID"].ToString();
                                        string UserID = Session["UserID"].ToString();
                                        ProcessLogin(UserID);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        catch (Exception eX) { }
    }

    void ProcessLogin(string UserID)
    {
        try
        {
            string err = String.Empty;
            Session[Tools.SessionVariables.UserID] = UserID;
            string cmd = "INSERT INTO UserLogTrail (UserID, IPAddress) Values ('" + Session[Tools.SessionVariables.UserID].ToString().Trim() + "', '" + Tools.GetIP() + "')";
            int stat = Tools.ExecuteSQL(cmd, out err);
            StoreUserDetails(UserID);
        }
        catch (Exception eX) { }
    }

    void StoreUserDetails(string UserID)
    {
        string err = String.Empty;
        string cmd = "SELECT UserID,Name, Email FROM Users WHERE UserID='" + UserID + "'";
        DataSet ds = new DataSet("ds");
        int stat = Tools.GetData(cmd, out ds, out err);
        if (ds.Tables[0].Rows.Count > 0)
        {
            Session["UserName"] = ds.Tables[0].Rows[0]["Name"];
            Session["UserEmail"] = ds.Tables[0].Rows[0]["Email"];
            SendMail(Session["UserEmail"].ToString(), Session["UserName"].ToString());
            Response.Redirect("Home.aspx");
        }
    }

    void SendMail(string Email, string Name)
    {
        try
        {
            bool userVal = false;
            if (Email.ToString() == "" || Email.ToString() == null)
            {
                userVal = false;
            }
            else
            {
                userVal = true;
                string emailSubject = "";
                string emailBody = Tools.GetEmailBody("Facebook Registration", out emailSubject);
                emailBody = emailBody.Replace("[Name]", Name);
                List<string> attachments = new List<string>();
                userVal = Tools.Pushmail(Email, emailSubject, emailBody, attachments);
                if (userVal == true)
                {
                    Tools.EmailLogTrail(Email, emailSubject, emailBody, "", "");
                }
            }
        }
        catch (Exception eX) { }
    }

    public class Tokenclass
    {
        public string Access_Token { get; set; }
        public string Token_Type { get; set; }
        public int Expires_In { get; set; }
        public string Refresh_Token { get; set; }
    }

    public class FaceBookUserProfile
    {
        public string ID { get; set; }
        public string First_Name { get; set; }
        public string Last_Name { get; set; }
        public string Name_Format { get; set; }
        public string Short_Name { get; set; }
        public string Name { get; set; }
        public string Email { get; set; }
        public ProfilePicture Picture { get; set; }
    }

    public class ProfilePicture
    {
        public Data Data { get; set; }
    }

    public class Data
    {
        public string Height { get; set; }
        public string Is_Silhouette { get; set; }
        public string Url { get; set; }
        public string Width { get; set; }
    }
}