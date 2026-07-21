<%@ Page Title="" Language="C#" MasterPageFile="~/Admin/AdminMasterPage.master" AutoEventWireup="true" CodeFile="ManageThemeTest.aspx.cs" Inherits="Admin_ManageThemeTest" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>
<%@ Register Src="~/Admin/Controls/AdminControls/AccountMenu.ascx" TagPrefix="dx" TagName="AccountMenu" %>
<%@ Register Src="~/Admin/Controls/AdminControls/FileUploader.ascx" TagPrefix="PageControl" TagName="FileUploader" %>

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
                    <a href="#" class="breadcrumb--active">Themes</a>
                </div>
                <div class="relative mr-3 sm:mr-6">
                    <div class="search hidden sm:block">
                    </div>
                </div>
                <dx:AccountMenu runat="server" ID="AccountMenu" />
            </div>
            <div class="grid grid-cols-12 gap-6 mt-5">
                <div class="col-span-12 lg:col-span-12">
                    <div class="box">
                        <div class="flex flex-col sm:flex-row items-center p-5 border-b border-gray-200">
                            <h2 class="font-medium text-base mr-auto">Themes
                            </h2>
                            <div class="w-full sm:w-auto flex items-center sm:ml-auto mt-3 sm:mt-0">
                                <asp:LinkButton ID="lnkAddTheme" runat="server" CssClass="button w-full xl:w-32 text-white bg-theme-1" Text="Add new" ToolTip="Add new" OnClick="lnkAddTheme_Click" />&nbsp;&nbsp;
                        <asp:LinkButton ID="lnkBackToRooms" runat="server" CssClass="button w-full xl:w-32 text-white bg-theme-1" Text="Back to Rooms" ToolTip="Back to Rooms" OnClick="lnkBackToRooms_Click" />
                                <asp:LinkButton ID="lnkBackToThemes" runat="server" CssClass="button w-full xl:w-32 text-white bg-theme-1" Text="Back to Themes" ToolTip="Back to Themes" OnClick="lnkBackToThemes_Click" Visible="false" />
                            </div>
                        </div>
                        <div id="divThemeGrid" runat="server">
                            <div class="p-5">
                                <div class="preview overflow">
                                    <dx:ASPxGridView ID="GridThemes" runat="server" ClientInstanceName="GridThemes" Width="100%" AutoGenerateColumns="False" KeyFieldName="RoomID"
                                        EnableRowsCache="false" EnableCallBacks="false" DataSourceID="ThemeSource" Styles-AlternatingRow-Enabled="True">
                                        <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="true"></SettingsAdaptivity>
                                        <Columns>
                                            <dx:GridViewDataTextColumn FieldName="ThemeName" ReadOnly="True" VisibleIndex="0" Caption="Theme" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="IsActive" ReadOnly="True" VisibleIndex="0" Caption="Status" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn ReadOnly="True" VisibleIndex="2" HeaderStyle-Font-Bold="true">
                                                <DataItemTemplate>
                                                    <div class="dropdown relative">
                                                        <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                                                        <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                                            <div class="dropdown-box__content box p-2">
                                                                <asp:LinkButton ID="btnEdit" runat="server" Text="Edit" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="btnEdit_Click" CommandArgument='<% #Bind("ThemeID")%>' />
                                                                <asp:LinkButton ID="btnImgManagement" runat="server" Text="Image Management" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="btnImgManagement_Click" CommandArgument='<% #Bind("ThemeID")%>' />
                                                                <asp:LinkButton ID="btnConfigure" runat="server" Text="Configure" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="btnConfigure_Click" CommandArgument='<% #Bind("ThemeID")%>' />
                                                                <asp:LinkButton ID="btnDefaultSettings" runat="server" Text="Default Settings" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="btnDefaultSettings_Click" CommandArgument='<% #Bind("ThemeID")%>' />
                                                                <asp:LinkButton ID="btnProperties" runat="server" Text="Properties" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="btnProperties_Click" CommandArgument='<% #Bind("ThemeID")%>' />
                                                            </div>
                                                        </div>
                                                    </div>
                                                </DataItemTemplate>
                                            </dx:GridViewDataTextColumn>
                                        </Columns>
                                        <SettingsPager PageSize="10" NumericButtonCount="6" />
                                        <Settings ShowFilterRow="true" />
                                    </dx:ASPxGridView>
                                    <asp:SqlDataSource ID="ThemeSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetThemesForRooms @RoomID">
                                        <SelectParameters>
                                            <asp:SessionParameter Name="RoomID" SessionField="RoomID" />
                                        </SelectParameters>
                                    </asp:SqlDataSource>
                                </div>
                            </div>
                        </div>
                        <div id="divThemeForm" runat="server" visible="false">
                            <div class="p-5">
                                <div class="preview">
                                    <div>
                                        <label>Theme Name:*</label>
                                        <asp:TextBox runat="server" ID="txtTheme" CssClass="input w-full border mt-2"></asp:TextBox>
                                        <asp:RequiredFieldValidator ID="rfvTheme" runat="server" ControlToValidate="txtTheme" SetFocusOnError="true" ForeColor="Red" ErrorMessage="*Required" ValidationGroup="Theme"></asp:RequiredFieldValidator>
                                    </div>
                                    <div>
                                        <label>Status:</label><br />
                                        <asp:DropDownList ID="drpThemeActive" runat="server" CssClass="input w-full border" Width="30%">
                                            <asp:ListItem Value="0">InActive</asp:ListItem>
                                            <asp:ListItem Value="1">Active</asp:ListItem>
                                        </asp:DropDownList>
                                    </div>
                                    <asp:Button ID="btnSaveTheme" runat="server" Class="button bg-theme-1 text-white mt-5 w-24" OnClick="btnSaveTheme_Click" Text="Save"
                                        ValidationGroup="Theme" CausesValidation="true" />
                                    <asp:Button ID="btnCancelTheme" runat="server" Text="Cancel" OnClick="btnCancelTheme_Click" class="button w-24 mr-1 mb-2 bg-gray-200 text-gray-600 ml-2" CausesValidation="false" />
                                    <br />
                                    <asp:Label ID="lblThemeMsg" runat="server" Font-Size="Small" ForeColor="Red" />
                                </div>
                            </div>
                        </div>
                        <asp:HiddenField ID="HfThemeID" runat="server" />
                        <div id="divThemeImageGrid" runat="server" visible="false">
                            <div class="p-5">
                                <asp:Button ID="btnAddImage" runat="server" class="button w-full xl:w-32 text-white bg-theme-1" Text="ADD NEW IMAGE" OnClick="btnAddImage_Click"></asp:Button>&nbsp;
                        <asp:Button ID="btnUpdateImage" runat="server" class="button w-full xl:w-32 text-white bg-theme-1" Text="UPDATE IMAGE" OnClick="btnUpdateImage_Click"></asp:Button>&nbsp;
                        <asp:Button ID="btnDeleteImage" runat="server" class="button w-full xl:w-32 text-white bg-theme-1" Text="DELETE IMAGE" OnClick="btnDeleteImage_Click"></asp:Button>&nbsp;
                            </div>
                            <div class="p-5">
                                <div class="preview overflow">
                                    <dx:ASPxGridView ID="GridThemeImages" runat="server" ClientInstanceName="GridThemeImages" Width="100%" AutoGenerateColumns="False" KeyFieldName="RoomID"
                                        EnableRowsCache="false" EnableCallBacks="false" DataSourceID="ThemeImageSource" Styles-AlternatingRow-Enabled="True" OnFocusedRowChanged="GridThemeImages_FocusedRowChanged">
                                        <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="true"></SettingsAdaptivity>
                                        <Columns>
                                            <dx:GridViewDataTextColumn FieldName="ImageDescription" ReadOnly="True" VisibleIndex="0" Caption="Image Description" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="DefaultImage" ReadOnly="True" VisibleIndex="1" Caption="Default Image" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                            </dx:GridViewDataTextColumn>
                                            <%--<dx:GridViewDataTextColumn FieldName="HoverImage" ReadOnly="True" VisibleIndex="2" Caption="Hover Image" HeaderStyle-Font-Bold="true" CellStyle-HorizontalAlign="Left">
                                    </dx:GridViewDataTextColumn>--%>
                                            <dx:GridViewDataImageColumn FieldName="Thumbnail" VisibleIndex="3">
                                                <PropertiesImage ImageHeight="50px" />
                                            </dx:GridViewDataImageColumn>
                                        </Columns>
                                        <SettingsPager PageSize="10" NumericButtonCount="6" />
                                        <Settings ShowFilterRow="true" />
                                        <SettingsBehavior AllowFocusedRow="true" />
                                    </dx:ASPxGridView>
                                    <asp:SqlDataSource ID="ThemeImageSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetThemeImagesByID @ThemeID">
                                        <SelectParameters>
                                            <asp:SessionParameter Name="ThemeID" SessionField="ThemeID" />
                                        </SelectParameters>
                                    </asp:SqlDataSource>
                                </div>
                            </div>
                        </div>
                        <div id="divThemeImageForm" runat="server" visible="false">
                            <div class="p-5">
                                <asp:Button ID="btnImageSave" runat="server" Class="button bg-theme-1 text-white mr-1 mb-2 w-24" OnClick="btnImageSave_Click" Text="Save"
                                    ValidationGroup="Theme" CausesValidation="true" />
                                <asp:Button ID="btnImageCancel" runat="server" Text="Cancel" OnClick="btnImageCancel_Click" class="button w-24 mr-1 mb-2 bg-gray-200 text-gray-600 ml-2" CausesValidation="false" />
                                <br />
                                <asp:Label ID="lblThemeImgMsg" runat="server" Font-Size="Small" ForeColor="Red" />
                                <div class="preview mt-5">
                                    <div>
                                        <label>Image Description:</label>
                                        <asp:TextBox runat="server" ID="txtImgDesc" CssClass="input w-full border mt-2"></asp:TextBox>
                                    </div>
                                    <div class="mt-3">
                                        <asp:CheckBox ID="chkDefault" runat="server" Text=" Set as Default Listing Image" />
                                    </div>
                                    <div class="mt-3">
                                        <label>Upload Product Image:</label><br />
                                        <br />
                                        <PageControl:FileUploader runat="server" ID="FileUploader" FileKey="ThemeImage" Hgt="1326" Wid="2880" />
                                    </div>
                                </div>
                                <asp:HiddenField ID="HfThemeImageID" runat="server" />
                            </div>
                            <div class="p-5">
                                <div class="preview overflow">
                                    <dx:ASPxGridView ID="GridImages" runat="server" ClientInstanceName="GridImages" Width="100%" AutoGenerateColumns="False" KeyFieldName="ImageID"
                                        EnableRowsCache="false" EnableCallBacks="false" DataSourceID="ImageSource">
                                        <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="true"></SettingsAdaptivity>
                                        <Columns>
                                            <dx:GridViewDataTextColumn FieldName="ImageID" ReadOnly="True" VisibleIndex="0">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="ImageDescription" VisibleIndex="1">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataTextColumn FieldName="DefaultImage" ReadOnly="True" VisibleIndex="2">
                                            </dx:GridViewDataTextColumn>
                                            <dx:GridViewDataImageColumn FieldName="Thumbnail" VisibleIndex="3">
                                                <PropertiesImage ImageHeight="70px" />
                                            </dx:GridViewDataImageColumn>
                                            <dx:GridViewDataImageColumn FieldName="ListView" VisibleIndex="4">
                                                <PropertiesImage ImageHeight="70px" />
                                            </dx:GridViewDataImageColumn>
                                            <dx:GridViewDataImageColumn FieldName="DetailsView" VisibleIndex="4">
                                                <PropertiesImage ImageHeight="70px" />
                                            </dx:GridViewDataImageColumn>
                                            <dx:GridViewDataImageColumn FieldName="HighRes" VisibleIndex="5">
                                                <PropertiesImage ImageHeight="70px" />
                                            </dx:GridViewDataImageColumn>
                                        </Columns>
                                        <SettingsPager PageSize="10" NumericButtonCount="6" />
                                        <Settings ShowFilterRow="true" />
                                    </dx:ASPxGridView>
                                    <asp:SqlDataSource ID="ImageSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                                        SelectCommand="GetImageDetailsByID" SelectCommandType="StoredProcedure">
                                        <SelectParameters>
                                            <asp:ControlParameter ControlID="hdnImageID" Name="ImageID" />
                                        </SelectParameters>
                                    </asp:SqlDataSource>
                                    <asp:HiddenField ID="hdnImageID" runat="server" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <dx:ASPxPopupControl ID="PopUpDeleteConfirmMsg" runat="server" CloseAction="CloseButton" CloseOnEscape="true" Width="500px" HeaderStyle-ForeColor="#003470"
                PopupHorizontalAlign="WindowCenter" PopupVerticalAlign="WindowCenter" ClientInstanceName="PopUpDeleteConfirmMsg" EnableAnimation="true" HeaderText="">
                <ContentCollection>
                    <dx:PopupControlContentControl runat="server">
                        <asp:Label ID="Label1" runat="server" Text="The selected image will be permanently deleted, Are you sure you want to proceed?" />
                        <div style="display: flex; justify-content: space-between; margin-top: 20px">
                            <asp:Button ID="btnDeleteYes" runat="server" Text="Yes" OnClick="btnDeleteYes_Click" CssClass="button w-full xl:w-32 text-white bg-theme-1" />
                            <asp:Button ID="btnDeleteNo" runat="server" Text="No" OnClick="btnDeleteNo_Click" CssClass="button w-full xl:w-32 text-white bg-theme-1" />
                        </div>
                    </dx:PopupControlContentControl>
                </ContentCollection>
                <ContentStyle>
                    <Paddings Padding="15px" />
                </ContentStyle>
            </dx:ASPxPopupControl>
            <dx:ASPxPopupControl ID="PopUpImageUpdateMsg" runat="server" CloseAction="CloseButton" CloseOnEscape="true" Width="500px" HeaderStyle-ForeColor="#003470"
                PopupHorizontalAlign="WindowCenter" PopupVerticalAlign="WindowCenter" ClientInstanceName="PopUpSelectImageMsg" EnableAnimation="true" HeaderText="">
                <ContentCollection>
                    <dx:PopupControlContentControl runat="server">
                        <asp:Label ID="Label2" runat="server" Text="Please select the image you want to update." />
                    </dx:PopupControlContentControl>
                </ContentCollection>
                <ContentStyle>
                    <Paddings Padding="15px" />
                </ContentStyle>
            </dx:ASPxPopupControl>
            <dx:ASPxPopupControl ID="PopUpImageDeleteMsg" runat="server" CloseAction="CloseButton" CloseOnEscape="true" Width="500px" HeaderStyle-ForeColor="#003470"
                PopupHorizontalAlign="WindowCenter" PopupVerticalAlign="WindowCenter" ClientInstanceName="PopUpSelectImageMsg" EnableAnimation="true" HeaderText="">
                <ContentCollection>
                    <dx:PopupControlContentControl runat="server">
                        <asp:Label ID="Label3" runat="server" Text="Please select the image you want to delete." />
                    </dx:PopupControlContentControl>
                </ContentCollection>
                <ContentStyle>
                    <Paddings Padding="15px" />
                </ContentStyle>
            </dx:ASPxPopupControl>
        </ContentTemplate>
    </asp:UpdatePanel>
</asp:Content>

