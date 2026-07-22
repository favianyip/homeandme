<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ManagePartners.aspx.cs" Inherits="Admin_ManagePartners" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web" TagPrefix="dx" %>

<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Controls/UserControls/ErrorDisplay.ascx" TagPrefix="PageControl" TagName="ErrorDisplay" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="dx" TagName="AccountMenu" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">
        function onlyAlphabets(e, t) {
            try {
                if (window.event) {
                    var charCode = window.event.keyCode;
                }
                else if (e) {
                    var charCode = e.which;
                }
                else { return true; }
                if ((charCode > 64 && charCode < 91) || (charCode > 96 && charCode < 123) || (charCode == 32))
                    return true;
                else
                    return false;
            }
            catch (err) {
                alert(err.Description);
            }
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <div class="top-bar">
        <div class="breadcrumb mr-auto hidden sm:flex">
            <a href="AdminDashboard.aspx" class="">Home</a>
            <i data-feather="chevron-right" class="breadcrumb__icon"></i>
            <a href="#" class="breadcrumb--active">Manage Partners</a>
        </div>
        <div class="relative mr-3 sm:mr-6">
            <div class="search hidden sm:block">
            </div>
        </div>
        <dx:accountmenu runat="server" id="AccountMenu" />
    </div>
    <asp:UpdatePanel runat="server" ID="up">
        <ContentTemplate>
            <div class="grid grid-cols-12 gap-6 mt-5">
                <div class="col-span-12 lg:col-span-12">
                    <div class="box">
                        <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                            <h2 class="font-medium text-base mr-auto">Partners
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                                <asp:LinkButton ID="btnNew" runat="server" CssClass="button w-full xl:w-32 text-white bg-theme-1" Text="Add new" ToolTip="Add new" OnClick="btnNew_Click" />
                            </div>
                        </div>
                        <div id="divPartnerGrid" runat="server">
                            <div class="p-5">
                                <div class="preview overflow">
                                    <dx:aspxgridview id="GridPartners" runat="server" clientinstancename="GridPartners" width="100%" autogeneratecolumns="False" keyfieldname="PartnerID"
                                        enablerowscache="false" enablecallbacks="false" datasourceid="PartnerSource" styles-alternatingrow-enabled="True">
                                        <settingsadaptivity adaptivitymode="HideDataCells" allowonlyoneadaptivedetailexpanded="true"></settingsadaptivity>
                                        <columns>
                                            <dx:gridviewdatatextcolumn fieldname="PartnerID" readonly="true" visibleindex="1" visible="false" caption="Partner ID" headerstyle-font-bold="true" cellstyle-horizontalalign="Left">
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="JoinedOn" readonly="True" caption="Joined on" visibleindex="2" headerstyle-font-bold="true" cellstyle-horizontalalign="Left">
                                                <propertiestextedit displayformatstring="dd MMM yyyy"></propertiestextedit>
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="Name" readonly="True" visibleindex="3" caption="Partner name" headerstyle-font-bold="true" cellstyle-horizontalalign="Left">
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="Email" readonly="True" visibleindex="4" caption="Email" headerstyle-font-bold="true" cellstyle-horizontalalign="Left">
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="ProjectsCompleted" readonly="True" visibleindex="5" caption="Projects completed" headerstyle-font-bold="true" cellstyle-horizontalalign="Left">
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn readonly="True" visibleindex="6" caption="Details" headerstyle-font-bold="true">
                                                <dataitemtemplate>
                                                    <div class="dropdown relative">
                                                        <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                        <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                                            <div class="dropdown-box__content box p-2">
                                                                <asp:LinkButton ID="btnEdit" runat="server" Text="Edit" OnClick="btnEdit_Click" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" CommandArgument='<% #Bind("PartnerID")%>' />
                                                                <asp:LinkButton ID="btnManageProduct" runat="server" Text="Manage Product" OnClick="btnManageProduct_Click" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" CommandArgument='<% #Bind("PartnerID")%>' CommandName='<% #Bind("Name")%>' />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </dataitemtemplate>
                                            </dx:gridviewdatatextcolumn>
                                        </columns>
                                        <settingspager pagesize="10" numericbuttoncount="3" />
                                        <settings showfilterrow="false" />
                                    </dx:aspxgridview>
                                    <asp:SqlDataSource ID="PartnerSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="Get_Partners"></asp:SqlDataSource>
                                    <pagecontrol:errordisplay runat="server" id="ErrorDisplay" controltype="ProjectEdit" />
                                    <asp:HiddenField ID="HfPartnerID" runat="server" />
                                </div>
                            </div>
                        </div>
                        <div id="divPartnerForm" runat="server" visible="false">
                            <div class="p-5">
                                <div class="preview dropDowndxeOuter">
                                    <div class="mt-3 dropDowndxe">
                                        <label>Name:*</label>
                                        <asp:TextBox runat="server" ID="txtName" CssClass="input w-full border mt-2" onkeypress="return onlyAlphabets(event,this);"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="reqName" runat="server" ControlToValidate="txtName" SetFocusOnError="true" ForeColor="Red" Display="Dynamic" ErrorMessage="Please enter the name" ValidationGroup="Page"></asp:RequiredFieldValidator>
                                    </div>
                                    <div class="mt-3 dropDowndxe">
                                        <label>Email:*</label>
                                        <asp:TextBox ID="txtEmail" runat="server" CssClass="input w-full border mt-2" MaxLength="250" />
                                        <asp:RequiredFieldValidator ID="rfemail" runat="server" ForeColor="Red" ErrorMessage="Please enter the email"
                                            ControlToValidate="txtEmail" Display="Dynamic" ValidationGroup="Page" />
                                        <asp:RegularExpressionValidator runat="server" ID="regExEmail" SetFocusOnError="true" ControlToValidate="txtEmail" ErrorMessage="Enter Valid Email" ForeColor="Red" Display="Dynamic" ValidationExpression="\w+([-+.']\w+)*@\w+([-.]\w+)*\.\w+([-.]\w+)*" ValidationGroup="Page">
                                        </asp:RegularExpressionValidator>
                                    </div>
                                    <div class="mt-3 dropDowndxe">
                                        <label>Skills:*</label>
                                        <dx:aspxtokenbox id="TknSkills" runat="server" itemvaluetype="System.String" width="100%">
                                        </dx:aspxtokenbox>
                                    </div>
                                    <div class="mt-3 dropDowndxe">
                                        <label>Contact:*</label>
                                        <asp:TextBox ID="TxtContact" runat="server" CssClass="input w-full border mt-0" MaxLength="250" />
                                        <asp:RequiredFieldValidator ID="rfvContact" runat="server" ForeColor="Red" ErrorMessage="Please enter the contact number"
                                            ControlToValidate="TxtContact" Display="Dynamic" ValidationGroup="Page" />
                                        <asp:FilteredTextBoxExtender ID="fteContact" runat="server" TargetControlID="TxtContact" ValidChars="+-0123456789"></asp:FilteredTextBoxExtender>
                                    </div>
                                    <div class="mt-3 dropDowndxe">
                                        <label>Status:</label>
                                        <asp:DropDownList ID="ddlStatus" runat="server" CssClass="dateList">
                                            <asp:ListItem Text="InActive" Value="0" />
                                            <asp:ListItem Text="Active" Value="1" />
                                        </asp:DropDownList>
                                    </div>
                                    <div class="mt-3 dropDowndxe">
                                        <label>Contractor Name:*</label>
                                        <asp:TextBox ID="txtContractorName" runat="server" CssClass="input w-full border mt-0" MaxLength="250" onkeypress="return onlyAlphabets(event,this);" />
                                        <asp:RequiredFieldValidator ID="RequiredFieldValidator1" runat="server" ForeColor="Red" ErrorMessage="Please enter the contractor name"
                                            ControlToValidate="txtContractorName" Display="Dynamic" ValidationGroup="Page" />
                                    </div>
                                    <div class="mt-3 dropDowndxe">
                                        <label>Company Name:*</label>
                                        <asp:TextBox ID="txtCompanyName" runat="server" CssClass="input w-full border mt-0" MaxLength="250" onkeypress="return onlyAlphabets(event,this);" />
                                        <asp:RequiredFieldValidator ID="RequiredFieldValidator2" runat="server" ForeColor="Red" ErrorMessage="Please enter the company name"
                                            ControlToValidate="txtCompanyName" Display="Dynamic" ValidationGroup="Page" />
                                    </div>
                                    <div class="mt-3 dropDowndxe">
                                        <label>Company Register Number:*</label>
                                        <asp:TextBox ID="txtCompanyRegisterNumber" runat="server" CssClass="input w-full border mt-0" MaxLength="250" />
                                        <asp:RequiredFieldValidator ID="RequiredFieldValidator3" runat="server" ForeColor="Red" ErrorMessage="Please enter the company register number"
                                            ControlToValidate="txtCompanyRegisterNumber" Display="Dynamic" ValidationGroup="Page" />
                                    </div>
                                    <div class="mt-3 dropDowndxe">
                                        <label>Company Address1:*</label>
                                        <asp:TextBox ID="txtCompanyAddress1" runat="server" CssClass="input w-full border mt-0" TextMode="MultiLine" />
                                        <asp:RequiredFieldValidator ID="RequiredFieldValidator4" runat="server" ForeColor="Red" ErrorMessage="Please enter company address 1"
                                            ControlToValidate="txtCompanyAddress1" Display="Dynamic" ValidationGroup="Page" />
                                    </div>
                                    <div class="mt-3 dropDowndxe">
                                        <label>Company Address2:*</label>
                                        <asp:TextBox ID="txtCompanyAddress2" runat="server" CssClass="input w-full border mt-0" TextMode="MultiLine" />
                                        <asp:RequiredFieldValidator ID="RequiredFieldValidator5" runat="server" ForeColor="Red" ErrorMessage="Please enter company address 2"
                                            ControlToValidate="txtCompanyAddress2" Display="Dynamic" ValidationGroup="Page" />
                                    </div>
                                    <asp:Label ID="lblSubCategoryMsg" runat="server" Font-Size="Small" ForeColor="Red" />
                                </div>
                                <div>
                                    <asp:Button ID="btnSave" runat="server" Text="Save" CssClass="button bg-theme-1 text-white mt-5 w-24"
                                        OnClick="btnSave_Click" ValidationGroup="Page" />
                                    <asp:Button ID="btnCancel" runat="server" Text="Cancel" CssClass="button w-24 mr-1 mb-2 bg-gray-200 text-gray-600 ml-2" OnClick="btnCancel_Click" CausesValidation="false" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

