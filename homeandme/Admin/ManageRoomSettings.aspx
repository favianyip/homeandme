<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ManageRoomSettings.aspx.cs" Inherits="Admin_ManageRoomSettings" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="dx" TagName="AccountMenu" %>

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
                    <a href="#" class="breadcrumb--active">Rooms</a>
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
                            <h2 class="font-medium text-base mr-auto">Rooms
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                                <asp:LinkButton ID="btnNew" runat="server" CssClass="button w-full xl:w-32 text-white bg-theme-1" Text="Add new" ToolTip="Add new" OnClick="btnNew_Click" />
                            </div>
                        </div>
                        <div id="divRoomsGrid" runat="server">
                            <div class="p-5">
                                <div class="preview overflow">
                                    <dx:aspxgridview id="GridRooms" runat="server" clientinstancename="GridRooms" width="100%" autogeneratecolumns="False" keyfieldname="RoomID"
                                        enablerowscache="false" enablecallbacks="false" datasourceid="RoomSource" styles-alternatingrow-enabled="True">
                                        <settingsadaptivity adaptivitymode="HideDataCells" allowonlyoneadaptivedetailexpanded="true"></settingsadaptivity>
                                        <columns>
                                            <dx:gridviewdatatextcolumn fieldname="RoomName" readonly="True" visibleindex="0" caption="Room type" headerstyle-font-bold="true" cellstyle-horizontalalign="Left">
                                            </dx:gridviewdatatextcolumn>
                                            <dx:gridviewdataimagecolumn caption="Inactive Image" fieldname="ImageURL" propertiesimage-imagewidth="50" headerstyle-font-bold="true" propertiesimage-imageheight="50" readonly="True" visibleindex="1">
                                            </dx:gridviewdataimagecolumn>
                                            <dx:gridviewdataimagecolumn caption="Active Image" fieldname="ImageURL2" propertiesimage-imagewidth="50" headerstyle-font-bold="true" propertiesimage-imageheight="50" readonly="True" visibleindex="1">
                                            </dx:gridviewdataimagecolumn>
                                            <dx:gridviewdatatextcolumn readonly="True" visibleindex="2" headerstyle-font-bold="true">
                                                <dataitemtemplate>
                                                    <div class="dropdown relative">
                                                        <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                        <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20 rooms-Opt-But">
                                                            <div class="dropdown-box__content box p-2">
                                                                <asp:LinkButton ID="btnEdit" runat="server" Text="Edit" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="btnEdit_Click" CommandArgument='<% #Bind("RoomID")%>' />
                                                                <asp:LinkButton ID="btnTheme" runat="server" Text="Theme" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" Visible='<%# Convert.ToBoolean(Convert.ToInt32(Eval("Visibility"))) %>' OnClick="btnTheme_Click" CommandArgument='<% #Bind("RoomID")%>' />
                                                                <asp:LinkButton ID="btnRoomConfigure" runat="server" Text="Configure" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="btnRoomConfigure_Click" CommandArgument='<% #Bind("RoomID")%>' />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </dataitemtemplate>
                                            </dx:gridviewdatatextcolumn>
                                        </columns>
                                        <settingspager pagesize="10" numericbuttoncount="6" />
                                        <settings showfilterrow="true" />
                                    </dx:aspxgridview>
                                    <asp:SqlDataSource ID="RoomSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetRooms" SelectCommandType="StoredProcedure"></asp:SqlDataSource>
                                </div>
                            </div>
                        </div>
                        <div id="divRoomForm" runat="server" visible="false">
                            <div class="p-5" id="vertical-form">
                                <div class="preview">
                                    <div>
                                        <label>Room Name:*</label>
                                        <asp:TextBox runat="server" ID="TxtRooms" CssClass="input w-full border mt-2"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="reqRole" runat="server" ControlToValidate="TxtRooms" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*" ValidationGroup="Page"></asp:RequiredFieldValidator>
                                    </div>
                                    <div class="mt-3 ">
                                        <label>Status:</label>
                                        <asp:DropDownList ID="ddlRoomActive" runat="server" CssClass="input w-full border">
                                            <asp:ListItem Value="0">InActive</asp:ListItem>
                                            <asp:ListItem Value="1">Active</asp:ListItem>
                                        </asp:DropDownList>
                                    </div>
                                    <div class="mt-3 ">
                                        <label>Is Initial Load:</label>
                                        <asp:DropDownList ID="ddlRoomInitialLoad" runat="server" CssClass="input w-full border">
                                            <asp:ListItem Value="0">No</asp:ListItem>
                                            <asp:ListItem Value="1">Yes</asp:ListItem>
                                        </asp:DropDownList>
                                    </div>
                                    <div class="mt-3 ">
                                        <label>Inactive Image(png/jpg < 500 KB):*</label>
                                        <dx:aspxcallbackpanel id="ASPxCallbackPanelRoom" runat="server"
                                            clientinstancename="cp" oncallback="ASPxCallbackPanelRoom_Callback">
                                            <panelcollection>
                                                <dx:panelcontent runat="server" supportsdisabledattribute="True">
                                                    <div class="input w-full border mt-2">
                                                        <dx:aspxuploadcontrol id="FileOptionImage" runat="server" clientinstancename="FileOptionImage"
                                                            onfileuploadcomplete="FileOptionImage_FileUploadComplete"
                                                            showprogresspanel="true" showuploadbutton="True" width="100%">
                                                            <clientsideevents fileuploadcomplete="function(s, e) {
	                                                                                            cp.PerformCallback(e.callbackData);
                                                                                            }" />
                                                        </dx:aspxuploadcontrol>
                                                    </div>
                                                    <asp:Image runat="server" ID="OptionImages" Width="150px" Height="150px" AlternateText="No image available" />
                                                </dx:panelcontent>
                                            </panelcollection>
                                        </dx:aspxcallbackpanel>
                                        <asp:Label ID="lblSubCategoryMsg" runat="server" Font-Size="Small" ForeColor="Red" />
                                    </div>
                                    <div class="mt-3 ">
                                        <label>Active Image(png/jpg < 500 KB):*</label>
                                        <dx:aspxcallbackpanel id="panelRoomActiveImage" runat="server"
                                            clientinstancename="cp1" oncallback="panelRoomActiveImage_Callback">
                                            <panelcollection>
                                                <dx:panelcontent runat="server" supportsdisabledattribute="True">
                                                    <div class="input w-full border mt-2">
                                                        <dx:aspxuploadcontrol id="FileActiveImage" runat="server" clientinstancename="FileActiveImage"
                                                            onfileuploadcomplete="FileActiveImage_FileUploadComplete"
                                                            showprogresspanel="true" showuploadbutton="True" width="100%">
                                                            <clientsideevents fileuploadcomplete="function(s, e) {
	                                                                                            cp1.PerformCallback(e.callbackData);
                                                                                            }" />
                                                        </dx:aspxuploadcontrol>
                                                    </div>
                                                    <asp:Image runat="server" ID="ActiveImage" Width="150px" Height="150px" AlternateText="No image available" />
                                                </dx:panelcontent>
                                            </panelcollection>
                                        </dx:aspxcallbackpanel>
                                        <asp:Label ID="lblActiveImageMsg" runat="server" Font-Size="Small" ForeColor="Red" />
                                    </div>
                                    <asp:Button ID="btnSave" runat="server" class="button bg-theme-1 text-white mt-5 w-24" OnClick="btnSave_Click" Text="Save"
                                        ValidationGroup="Page" CausesValidation="true" />
                                    <asp:Button ID="BtnCancel" runat="server" Text="Cancel" OnClick="BtnCancel_Click" class="button w-24 mr-1 mb-2 bg-gray-200 text-gray-600 ml-2" CausesValidation="false" />
                                </div>
                            </div>
                        </div>
                        <asp:HiddenField ID="HfRoomID" runat="server" />
                    </div>
                </div>
            </div>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

