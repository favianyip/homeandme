<%@ Control Language="C#" AutoEventWireup="true" CodeFile="WorkType.ascx.cs" Inherits="Admin_Controls_AdminControls_WorkType" %>
<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductCategorySettings.ascx" TagPrefix="uc1" TagName="ProductCategorySettings" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductSettings.ascx" TagPrefix="uc1" TagName="ProductSettings" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductSubOptionSettings.ascx" TagPrefix="uc1" TagName="ProductSubOptionSettings" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductSubOptionLevel2.ascx" TagPrefix="uc1" TagName="ProductSubOptionLevel2" %>
<%@ Register Src="~/Admin/Controls/AdminControls/ProductSubOptionLevel3.ascx" TagPrefix="uc1" TagName="ProductSubOptionLevel3" %>
<%@ Register Src="~/Admin/Controls/AdminControls/FileUploader.ascx" TagPrefix="uc1" TagName="FileUploader" %>


<script type="text/javascript">
    function popMsg(s, e) {
        var mainDiv = document.getElementById(s.name + '_PW-1');
        mainDiv.style.width = '30%';
        mainDiv.style.width = '30%';
        s.SetWidth(mainDiv.clientWidth); 
        s.UpdatePosition();
    }
</script>


<div class="flex flex-col sm:flex-row items-center p-5 delearWapper" id="DivtopItems" runat="server">
    <div class="delearOuter">
        <asp:TextBox ID="txtSearch" runat="server" CssClass="input w-full border mt-2 mr-2"></asp:TextBox>
        <asp:Button ID="btnSearch" runat="server" CssClass="button bg-theme-1 text-white mt-2" Text="Search" OnClick="btnSearch_Click" />
    </div>
    <div>
        <asp:Button ID="btnNew" runat="server" CssClass="button bg-theme-1 text-white " Text="Add New" OnClick="btnNew_Click" />
    </div>
</div>
<div class="flex flex-col p-5">
    <div id="divGrid" runat="server">
        <dx:ASPxGridView ID="GridWorkTypes" runat="server" ClientInstanceName="GridWorkTypes" Width="100%" AutoGenerateColumns="False" KeyFieldName="ScopeID"
            EnableRowsCache="false" EnableCallBacks="false" DataSourceID="WorkTypeSource" Styles-AlternatingRow-Enabled="True">
            <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="false"></SettingsAdaptivity>
            <Columns>
                <dx:GridViewDataTextColumn FieldName="Scope" ReadOnly="True" VisibleIndex="1" Caption="Work Type" CellStyle-HorizontalAlign="Left" HeaderStyle-Font-Bold="true">
                </dx:GridViewDataTextColumn>
                <dx:GridViewDataImageColumn Caption="Inactive Image" FieldName="ImageUrl" PropertiesImage-ImageWidth="50" HeaderStyle-Font-Bold="true" PropertiesImage-ImageHeight="50" ReadOnly="True" VisibleIndex="2">
                </dx:GridViewDataImageColumn>
                <dx:GridViewDataImageColumn Caption="Active Image" FieldName="ImageUrl2" PropertiesImage-ImageWidth="50" HeaderStyle-Font-Bold="true" PropertiesImage-ImageHeight="50" ReadOnly="True" VisibleIndex="2">
                </dx:GridViewDataImageColumn>
                <dx:GridViewDataTextColumn FieldName="IsHidden" ReadOnly="True" VisibleIndex="8" HeaderStyle-Font-Bold="true" Caption="Is Hidden" CellStyle-HorizontalAlign="Left">
                </dx:GridViewDataTextColumn>
                <dx:GridViewDataTextColumn FieldName="Type" ReadOnly="True" VisibleIndex="8" HeaderStyle-Font-Bold="true" Caption="Type" CellStyle-HorizontalAlign="Left">
                </dx:GridViewDataTextColumn>
                <dx:GridViewDataColumn FieldName="ScopeID" Width="200px" Caption="#" HeaderStyle-Font-Bold="true" AdaptivePriority="0" VisibleIndex="9">
                    <DataItemTemplate>
                        <div class="dropdown relative">
                            <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                            <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                <div class="dropdown-box__content box p-2">
                                    <asp:LinkButton ID="btnEdit" runat="server" Text="Edit" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="btnEdit_Click" CommandArgument='<% #Bind("ScopeID")%>' /></span>
                                    <asp:LinkButton ID="btnRemove" runat="server" Text='<% #Bind("StatusText")%>' CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" OnClick="btnRemove_Click" CommandArgument='<% #Bind("ScopeID")%>' /></span>
                                </div>
                            </div>
                        </div>
                    </DataItemTemplate>
                    <Settings AllowHeaderFilter="False" AllowAutoFilter="False" />
                </dx:GridViewDataColumn>
            </Columns>
        </dx:ASPxGridView>
        <asp:SqlDataSource ID="WorkTypeSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
            SelectCommand="get_ScopesDetails"></asp:SqlDataSource>
        <asp:HiddenField ID="hdnIsHidden" runat="server" />
        <div class="mb-16"></div>
    </div>
    <div id="divEditCreate" runat="server" visible="false">
        <div class="dropDowndxeOuter">
            <div class="mt-3 dropDowndxe">
                <div>
                    <label>Work Type:*</label>
                    <asp:TextBox ID="txtScope" runat="server" CssClass="input w-full border mt-2" MaxLength="250" Width="100%" />
                    <asp:RequiredFieldValidator ID="RequiredFieldValidator3" runat="server" ErrorMessage="Enter the Scope"
                        ControlToValidate="txtScope" ValidationGroup="Page" ForeColor="Red" Display="Dynamic"
                        Font-Size="X-Small" SetFocusOnError="true"></asp:RequiredFieldValidator>
                </div>
                <div class="mt-8">
                    <label>Type:*</label>
                    <dx:ASPxComboBox ID="cmbType" runat="server" CssClass="dateList" ValueType="System.String" SelectedIndex="0" Width="100%">
                        <Items>
                            <dx:ListEditItem Text="General" Value="-1" />
                            <dx:ListEditItem Text="Wet Work" Value="1" />
                        </Items>
                    </dx:ASPxComboBox>
                </div>
            </div>
            <div class="mt-3 dropDowndxe">
                <div>
                    <label>IsHidden:*</label>
                    <dx:ASPxComboBox ID="cmbIsHidden" runat="server" CssClass="dateList mt-2" ValueType="System.String" SelectedIndex="0" Width="100%">
                        <Items>
                            <dx:ListEditItem Text="No" Value="0" />
                            <dx:ListEditItem Text="Yes" Value="1" />
                        </Items>
                    </dx:ASPxComboBox>
                </div>
            </div>
            <div class="mt-3 dropDowndxe">
                <div style="display: flex;" class="mt-8">
                    <label>Current Inactive Image : </label>
                    <asp:Image runat="server" ID="ScopeImage" AlternateText="No image available" Width="150px" Style="margin-left: 35px;" />
                </div>
                <div class="mt-8" style="display: flex;">
                    <div>
                        <p>
                            <label>Inactive Image</label>
                        </p>
                        <label>(jpeg/jpg/png  < 500 KB, 300px X 300px)</label>
                    </div>
                    <div style="margin-right: 7px;">
                        <label>:</label>
                    </div>
                    <uc1:FileUploader runat="server" ID="FileUploader" FileKey="ScopeImage" Hgt="300" Wid="300" />
                </div>
            </div>
            <div class="mt-3 dropDowndxe">
                <div style="display: flex;" class="mt-8">
                    <label>Current Active Image : </label>
                    <asp:Image runat="server" ID="InactiveImageURL" AlternateText="No image available" Width="150px" Style="margin-left: 35px;" />
                </div>
                <div class="mt-8" style="display: flex;">
                    <div>
                        <p>
                            <label>Active Image</label>
                        </p>
                        <label>(jpeg/jpg/png  < 500 KB, 300px X 300px)</label>
                    </div>
                    <div style="margin-right: 7px;">
                        <label>:</label>
                    </div>
                    <uc1:FileUploader runat="server" ID="fuActiveImage" FileKey="ActiveScopeImage" Hgt="300" Wid="300" />
                </div>
            </div>
            <br />
            <div class="mt-3 ml-5">
                <div>
                    <b>
                        <label>Fee : </label>
                    </b>
                    <asp:CheckBoxList ID="cblFees" runat="server" RepeatDirection="Vertical" CssClass="input w-full mt-2" Width="100%" DataSourceID="dsFees" DataTextField="FeeText" DataValueField="ApplicationDetailID">
                    </asp:CheckBoxList>
                    <asp:SqlDataSource ID="dsFees" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
                        SelectCommand="SELECT ApplicationDetailID, ' ' + ItemText AS FeeText FROM ApplicationDetails WHERE Type = 1 AND Status = 1"></asp:SqlDataSource>
                </div>
            </div>
        </div>
        <div>
            <asp:HiddenField ID="hdnScopeID" runat="server" />
            <asp:Button ID="btnSave" runat="server" CssClass="button bg-theme-1 text-white mt-5 w-24" OnClick="btnSave_Click" Text="Save"
                ValidationGroup="Page" CausesValidation="true" />
            <asp:Button ID="btnCancel" runat="server" CssClass="button w-24 ml-2 mb-2 bg-gray-200 text-gray-600" OnClick="btnCancel_Click" Text="Cancel"
                ValidationGroup="Page" CausesValidation="false" />
        </div>
    </div>
</div>
<dx:ASPxPopupControl ID="PopDelete" runat="server" CloseAction="CloseButton" CloseOnEscape="true" Width="300px"
    PopupHorizontalAlign="WindowCenter" PopupVerticalAlign="WindowCenter" ClientInstanceName="pcLogin" HeaderText="">
    <ClientSideEvents PopUp="popMsg" Shown="function(s){setTimeout(function() {s.UpdatePosition();}, 0);}" />
    <ContentCollection>
        <dx:PopupControlContentControl runat="server">
            <br />
            <asp:Literal ID="litAlert" runat="server" />
            <br />
            <br />
            <asp:Button ID="BtnDelete" runat="server" Text="Confirm" OnClick="BtnDelete_Click" CssClass="button bg-theme-1 text-white mt-5 w-24" />&nbsp;&nbsp;&nbsp;&nbsp;
                    <asp:Button ID="BtnRemoveCancel" runat="server" Text="Cancel" OnClick="BtnRemoveCancel_Click" CssClass="button w-24 mr-1 mb-2 bg-gray-200 text-gray-600" />

        </dx:PopupControlContentControl>
    </ContentCollection>
    <ContentStyle>
        <Paddings Padding="15px" />
    </ContentStyle>
</dx:ASPxPopupControl>

