<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ConfigureRoom.aspx.cs" Inherits="Admin_ConfigureRoom" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="dx" TagName="AccountMenu" %>
<%@ Register Assembly="DevExpress.Web.ASPxTreeList.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a"
    Namespace="DevExpress.Web.ASPxTreeList" TagPrefix="dx" %>
<%@ Register Assembly="CKEditor.NET" Namespace="CKEditor.NET" TagPrefix="CKEditor" %>
<%@ Register Src="~/Admin/Controls/AdminControls/FileUploader.ascx" TagPrefix="uc1" TagName="FileUploader" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <asp:UpdatePanel runat="server" ID="up">
        <ContentTemplate>
            <div class="top-bar">
                <div class="breadcrumb mr-auto hidden sm:flex">
                    <a href="AdminDashboard.aspx" class="">Home</a>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right breadcrumb__icon">
                        <polyline points="9 18 15 12 9 6"></polyline></svg>
                    <a href="ManageRoomSettings.aspx" class="breadcrumb--active">Rooms</a>
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="feather feather-chevron-right breadcrumb__icon">
                        <polyline points="9 18 15 12 9 6"></polyline></svg>
                    <a href="#" class="breadcrumb--active">Configure Rooms</a>
                </div>
                <div class="relative mr-3 sm:mr-6">
                    <div class="search hidden sm:block">
                    </div>
                </div>
                <dx:accountmenu runat="server" id="AccountMenu" />
            </div>
            <div class="grid grid-cols-12 gap-6 mt-5">
                <div class="col-span-12 lg:col-span-12">
                    <div class="box">
                        <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                            <h2 class="font-medium text-base mr-auto">Room Configuration
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                            </div>
                        </div>
                        <div class="p-5">
                            <label><b>Work Type:</b></label>
                            <dx:aspxcombobox id="cmbScopes" runat="server" autopostback="true" cssclass="dateList" textfield="Scope" valuefield="ScopeID"
                                valuetype="System.String" selectedindex="0" onselectedindexchanged="cmbScopes_SelectedIndexChanged" nulltext="SELECT">
                            </dx:aspxcombobox>
                            <div class="preview dropDowndxeOuter" id="divRoomsGrid" runat="server" visible="false">
                                <div class="mt-3 dropDowndxe">
                                    <dx:aspxgridview id="GridRoomOptions" runat="server" clientinstancename="GridRoomOptions" width="100%" enablecallbacks="false"
                                        enabletheming="false" keyfieldname="SubsubOptionL3ID" datasourceid="RoomOptionSource" styles-alternatingrow-enabled="True">
                                        <columns>
                                            <dx:gridviewcommandcolumn showselectcheckbox="true" visibleindex="0" width="30">
                                            </dx:gridviewcommandcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="OptionLevel" visibleindex="1" caption="Available Types">
                                                <settings autofiltercondition="Contains" />
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="SubsubOptionL3ID" visibleindex="2" caption="" visible="false">
                                            </dx:gridviewdatatextcolumn>
                                        </columns>
                                        <settingsbehavior allowmultiselection="true" />
                                        <settings showfilterrow="true" />
                                        <settingspager pagesize="10" />
                                    </dx:aspxgridview>
                                    <asp:SqlDataSource ID="RoomOptionSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetOptionListingByScope @ScopeID, @RoomID">
                                        <SelectParameters>
                                            <asp:SessionParameter Name="ScopeID" SessionField="ScopeID" />
                                            <asp:SessionParameter Name="RoomID" SessionField="RoomID" />
                                        </SelectParameters>
                                    </asp:SqlDataSource>
                                </div>
                                <div class="mt-3 dropDowndxeButArea">
                                    <asp:Button ID="btnAssign" runat="server" Text="Assign" Class="button bg-theme-1 text-white mt-5 w-24" OnClick="btnAssign_Click" />
                                </div>
                                <div class="mt-3 dropDowndxe">
                                    <asp:Panel ID="pnlTree" runat="server">
                                        <dx:aspxgridview id="GridAssignedRoomOptions" runat="server" clientinstancename="GridAssignedRoomOptions" width="100%" enablecallbacks="false"
                                            enabletheming="false" keyfieldname="RoomConfigureID" datasourceid="AssignedRoomOptionSource" styles-alternatingrow-enabled="True">
                                            <columns>
                                                <dx:gridviewdatatextcolumn fieldname="RoomConfigureID" readonly="True" visibleindex="0" visible="false">
                                                </dx:gridviewdatatextcolumn>
                                                <dx:gridviewdatatextcolumn fieldname="OptionLevel" readonly="True" visibleindex="1" caption="Selected Types"
                                                    headerstyle-horizontalalign="Left">
                                                </dx:gridviewdatatextcolumn>
                                                <dx:gridviewdatatextcolumn visibleindex="2" cellstyle-horizontalalign="Left" caption="#">
                                                    <dataitemtemplate>
                                                        <asp:LinkButton ID="btnRemove" runat="server" CommandArgument='<% #Bind("RoomConfigureID")%>' OnClick="btnRemove_Click" Text="Remove" Font-Underline="true" />
                                                    </dataitemtemplate>
                                                </dx:gridviewdatatextcolumn>
                                            </columns>
                                            <settingspager pagesize="10" />
                                        </dx:aspxgridview>
                                        <asp:SqlDataSource ID="AssignedRoomOptionSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                            SelectCommand="GetRoomConfigurationsListing @RoomID, @ScopeID">
                                            <SelectParameters>
                                                <asp:SessionParameter Name="RoomID" SessionField="RoomID" />
                                                <asp:SessionParameter Name="ScopeID" SessionField="ScopeID" />
                                            </SelectParameters>
                                        </asp:SqlDataSource>
                                    </asp:Panel>
                                </div>
                                <asp:Label ID="lblMsg" runat="server" Font-Size="Small" ForeColor="Red" />
                            </div>
                            <div class="preview" id="divWHOptions" runat="server" visible="false">
                                <div class="productOptAddNew mt-2">
                                    <asp:Button ID="btnAddNewWHOptions" runat="server" CssClass="button bg-theme-1 text-white " Text="Add New" OnClick="btnAddNewWHOptions_Click" />
                                </div>
                                <div class="mt-2">
                                    <dx:aspxgridview id="GridWHOptions" runat="server" clientinstancename="GridWHOptions" width="100%" enablecallbacks="false"
                                        enabletheming="false" keyfieldname="WHOptionID" datasourceid="dsWHOptions" styles-alternatingrow-enabled="True">
                                        <columns>
                                            <dx:gridviewdatatextcolumn fieldname="WHOptionName" visibleindex="1" caption="Name">
                                                <settings autofiltercondition="Contains" />
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="WHOptionID" visibleindex="2" caption="" visible="false">
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatacomboboxcolumn fieldname="Status" visibleindex="6" caption="Active/InActive">
                                                <propertiescombobox>
                                                    <items>
                                                        <dx:listedititem text="Inactive" value="0" />
                                                        <dx:listedititem text="Active" value="1" />
                                                    </items>
                                                </propertiescombobox>
                                            </dx:gridviewdatacomboboxcolumn>
                                            <dx:gridviewdatacomboboxcolumn fieldname="Type" visibleindex="6" caption="Type">
                                                <propertiescombobox>
                                                    <items>
                                                        <dx:listedititem text="Image" value="1" />
                                                        <dx:listedititem text="HTML Content" value="2" />
                                                    </items>
                                                </propertiescombobox>
                                            </dx:gridviewdatacomboboxcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="RoomType" visibleindex="6" caption="Room Type">
                                                <settings autofiltercondition="Contains" />
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatatextcolumn fieldname="Amount" visibleindex="7" caption="Amount">
                                                <settings autofiltercondition="Contains" />
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdatacolumn fieldname="WHOptionID" width="200px" headerstyle-font-bold="true" caption="#" adaptivepriority="0" visibleindex="7">
                                                <dataitemtemplate>
                                                    <div class="dropdown relative">
                                                        <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                        <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                                            <div class="dropdown-box__content box p-2">
                                                                <asp:LinkButton ID="btnWHGridEdit" runat="server" Text="Edit" OnClick="btnWHGridEdit_Click" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" CommandArgument='<% #Bind("WHOptionID")%>' />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </dataitemtemplate>
                                                <settings allowheaderfilter="False" allowautofilter="False" />
                                            </dx:gridviewdatacolumn>
                                        </columns>
                                        <settingsbehavior allowmultiselection="true" />
                                        <settings showfilterrow="true" />
                                        <settingspager pagesize="10" />
                                    </dx:aspxgridview>
                                    <asp:SqlDataSource ID="dsWHOptions" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetWHOptions" SelectCommandType="StoredProcedure">
                                        <SelectParameters>
                                            <asp:SessionParameter Name="RoomID" SessionField="RoomID" />
                                            <asp:SessionParameter Name="ScopeID" SessionField="ScopeID" />
                                        </SelectParameters>
                                    </asp:SqlDataSource>
                                    <asp:HiddenField ID="hdnWHOptionID" runat="server" />
                                </div>
                            </div>
                            <div id="divWHOptionForm" runat="server" visible="false">
                                <div class="">
                                    <div class="preview dropDowndxeOuter">
                                        <div class="mt-3 dropDowndxe">
                                            <label>Name:*</label>
                                            <asp:TextBox runat="server" ID="txtWHName" CssClass="input w-full border mt-2"></asp:TextBox>
                                            <asp:RequiredFieldValidator ID="reqName" runat="server" ControlToValidate="txtWHName" Display="Dynamic" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please enter the name." ValidationGroup="apartment"></asp:RequiredFieldValidator>
                                        </div>
                                        <div class="mt-3 dropDowndxe">
                                            <label>Status:</label>
                                            <asp:DropDownList ID="ddlStatus" runat="server" CssClass="input w-full border mt-2 dateList">
                                                <asp:ListItem Text="InActive" Value="0" />
                                                <asp:ListItem Text="Active" Value="1" />
                                            </asp:DropDownList>
                                        </div>
                                        <div class="mt-3 dropDowndxe">
                                            <label>Amount:*</label>
                                            <asp:TextBox runat="server" ID="txtWHAmount" CssClass="input w-full border mt-2"></asp:TextBox>
                                            <asp:RequiredFieldValidator ID="reqWHAmount" runat="server" ControlToValidate="txtWHAmount" Display="Dynamic" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please enter the amount." ValidationGroup="apartment"></asp:RequiredFieldValidator>
                                        </div>
                                        <div class="mt-3 dropDowndxe">
                                            <label><b>Property Type:*</b></label>
                                            <asp:DropDownList ID="ddlPropertyType" runat="server" CssClass="input w-full border mt-2 dateList" DataSourceID="dsPropertyType" DataTextField="PropertyTypeRoomText" DataValueField="PropertyTypeRoomID" OnSelectedIndexChanged="ddlPropertyType_SelectedIndexChanged" AutoPostBack="true">
                                            </asp:DropDownList>
                                            <asp:SqlDataSource ID="dsPropertyType" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>" SelectCommand="GetPropertyTypeRoomDetails" SelectCommandType="StoredProcedure"></asp:SqlDataSource>
                                        </div>
                                        <div class="mt-3 dropDowndxe">
                                            <label>Type:*</label>
                                            <asp:DropDownList ID="ddlWHOptionType" runat="server" CssClass="input w-full border mt-2 dateList" OnSelectedIndexChanged="ddlWHOptionType_SelectedIndexChanged" AutoPostBack="true">
                                                <asp:ListItem Text="--Select--" Value="-1" />
                                                <asp:ListItem Text="Image" Value="1" />
                                                <asp:ListItem Text="HTML Content" Value="2" />
                                            </asp:DropDownList>
                                            <asp:RequiredFieldValidator ID="reqWHOptionType" runat="server" ControlToValidate="ddlWHOptionType" InitialValue="-1" Display="Dynamic" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please select the type." ValidationGroup="apartment"></asp:RequiredFieldValidator>
                                        </div>
                                    </div>
                                    <div id="divImage" runat="server" visible="false" class="dropDowndxeOuter mt-3 ">
                                        <div class="mt-3 dropDowndxe">
                                            <label><b>Image:</b></label>
                                            <uc1:fileuploader runat="server" id="FileUploader" filekey="WHOPtionImage" hgt="300" wid="300" />
                                        </div>
                                        <div>
                                            <label><b>Current Image:</b></label>
                                            <asp:Image runat="server" ID="imgWHOption" AlternateText="No image available" Width="150px" Height="150px" Style="margin-left: 35px;" />
                                        </div>
                                    </div>
                                    <div class="mt-3" id="divHTMLContent" runat="server" visible="false">
                                        <label><b>HTML:</b></label>
                                        <ckeditor:ckeditorcontrol id="ckHTML" runat="server" basepath="~/ckeditor" height="500px" width="100%"></ckeditor:ckeditorcontrol>
                                        <asp:RequiredFieldValidator ID="reqHTML" runat="server" ControlToValidate="ckHTML" Display="Dynamic" SetFocusOnError="true" ForeColor="Red" ErrorMessage="Please enter the details." ValidationGroup="apartment"></asp:RequiredFieldValidator>
                                    </div>
                                    <div>
                                        <asp:Button ID="btnWHOptionSave" runat="server" Text="Save" CssClass="button bg-theme-1 text-white mt-5 w-24"
                                            OnClick="btnWHOptionSave_Click" ValidationGroup="apartment" />
                                        <asp:Button ID="btnWHOptionCancel" runat="server" Text="Cancel" CssClass="button w-24 mr-1 mb-2 bg-gray-200 text-gray-600 ml-2" OnClick="btnWHOptionCancel_Click" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

