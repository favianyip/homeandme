<%@ Control Language="C#" AutoEventWireup="true" CodeFile="ProductSubOptionSettings.ascx.cs" Inherits="Admin_Controls_AdminControls_ProductSubOptionSettings" %>
<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>

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
    <div class="delearOuter dropDowndxe">
        <div class="productOpt">
            <label>Work Type:</label>
            <dx:ASPxComboBox ID="cmbScopes" runat="server" AutoPostBack="true" CssClass="dateList" TextField="Scope" ValueField="ScopeID" ValueType="System.String" SelectedIndex="0" OnSelectedIndexChanged="cmbScopes_SelectedIndexChanged">
            </dx:ASPxComboBox>
        </div>
        <div class="productOpt">
            <label>Product Category:</label>
            <dx:ASPxComboBox ID="cmbCategory" runat="server" AutoPostBack="true" CssClass="dateList" TextField="Option" ValueField="OptionID" ValueType="System.String" SelectedIndex="0" OnSelectedIndexChanged="cmbCategory_SelectedIndexChanged">
            </dx:ASPxComboBox>
        </div>
        <div class="productOpt">
            <label>Products:</label>
            <dx:ASPxComboBox ID="cmbProducts" runat="server" AutoPostBack="true" CssClass="dateList" TextField="SubOption" ValueField="SubOptionID" ValueType="System.String" SelectedIndex="0" OnSelectedIndexChanged="cmbProducts_SelectedIndexChanged">
            </dx:ASPxComboBox>
        </div>
        <div class="productOptAddNew">
            <asp:Button ID="btnNew" runat="server" CssClass="button bg-theme-1 text-white" Text="Add New" OnClick="btnNew_Click" Visible="false" />
        </div>
    </div>

</div>
<div class="flex flex-col p-5">
    <div id="divGrid" runat="server" visible="false">
        <dx:ASPxGridView ID="GridProductOptions" runat="server" ClientInstanceName="GridProductOptions" Width="100%" AutoGenerateColumns="False" KeyFieldName="SubsubOptionId"
            EnableRowsCache="false" EnableCallBacks="false" DataSourceID="ProductGridSource" Styles-AlternatingRow-Enabled="True" AutoPostBack="true">
            <SettingsAdaptivity AdaptivityMode="HideDataCells" AllowOnlyOneAdaptiveDetailExpanded="false"></SettingsAdaptivity>
            <Columns>
                <dx:GridViewDataTextColumn FieldName="SubsubOption" HeaderStyle-Font-Bold="true" ReadOnly="True" VisibleIndex="1" Caption="Product Option" CellStyle-HorizontalAlign="Left">
                </dx:GridViewDataTextColumn>
                <dx:GridViewDataImageColumn Caption="Image" HeaderStyle-Font-Bold="true" FieldName="ImageUrl" PropertiesImage-ImageWidth="50" PropertiesImage-ImageHeight="50" ReadOnly="True" VisibleIndex="2">
                </dx:GridViewDataImageColumn>
                <dx:GridViewDataTextColumn FieldName="IsHidden" HeaderStyle-Font-Bold="true" ReadOnly="True" VisibleIndex="3" Caption="Is Hidden" CellStyle-HorizontalAlign="Left">
                </dx:GridViewDataTextColumn>
                <dx:GridViewDataColumn FieldName="SubOptionID" HeaderStyle-Font-Bold="true" Width="200px" Caption="#" AdaptivePriority="0" VisibleIndex="5">
                    <DataItemTemplate>
                        <div class="dropdown relative">
                            <div class="dropdown-toggle button inline-block bg-theme-1 text-white">Options</div>
                            <div class="dropdown-box mt-10 absolute w-40 top-0 left-0 z-20">
                                <div class="dropdown-box__content box p-2">
                                    <asp:LinkButton ID="btnEdit" runat="server" Text="Edit" OnClick="btnEdit_Click" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" CommandArgument='<% #Bind("SubsubOptionId")%>' />
                                    <asp:LinkButton ID="btnRemove" runat="server" Text='<% #Bind("StatusText")%>' OnClick="btnRemove_Click" CssClass="block p-2 transition duration-300 ease-in-out bg-white hover:bg-gray-200 rounded-md" CommandArgument='<% #Bind("SubsubOptionId")%>' /></span>
                                </div>
                            </div>
                        </div>
                    </DataItemTemplate>
                    <Settings AllowHeaderFilter="False" AllowAutoFilter="False" />
                </dx:GridViewDataColumn>
            </Columns>
        </dx:ASPxGridView>
        <asp:SqlDataSource ID="ProductGridSource" runat="server" ConnectionString="<%$ ConnectionStrings:ConnectionString %>"
            SelectCommand="SELECT SubsubOptionId,SubsubOption,SubOptions.SubOption, CASE WHEN SubsubOptions.IsHidden=1 THEN 'Yes' ELSE 'No' END AS IsHidden, SubsubOptions.ImageUrl,
                                        CASE WHEN SubsubOptions.IsHidden=1 THEN 'Activate' ELSE 'Deactivate' END AS StatusText
                                        FROM SubsubOptions INNER JOIN SubOptions ON SubOptions.SubOptionID = SubsubOptions.SubOptionID WHERE SubsubOptions.SubOptionID = @SubOptionID"
            SelectCommandType="Text">
            <SelectParameters>
                <asp:ControlParameter ControlID="cmbProducts" Name="SubOptionID" />
            </SelectParameters>
        </asp:SqlDataSource>
        <asp:HiddenField ID="hdnIsHidden" runat="server" />
        <div class="mb-16"></div>
    </div>
    <div id="divEditCreate" runat="server" visible="false">
        <div class="dropDowndxeOuter">
            <div class="mt-3 dropDowndxe">
                <div>
                    <label>Product Option:*</label>
                    <asp:TextBox ID="txtSubSubOption" runat="server" CssClass="input w-full border mt-2" MaxLength="250" Width="100%" />
                    <asp:RequiredFieldValidator ID="RequiredFieldValidator3" runat="server" ErrorMessage="Please enter the product option."
                        ControlToValidate="txtSubSubOption" ValidationGroup="Page" ForeColor="Red" Display="Dynamic"
                        Font-Size="X-Small" SetFocusOnError="true"></asp:RequiredFieldValidator>
                </div>
                <div class="mt-8">
                    <label>Is Hidden:*</label>
                    <dx:ASPxComboBox ID="cmbIsHidden" runat="server" CssClass="dateList" ValueType="System.String" SelectedIndex="0" Width="100%">
                        <Items>
                            <dx:ListEditItem Text="No" Value="0" />
                            <dx:ListEditItem Text="Yes" Value="1" />
                        </Items>
                    </dx:ASPxComboBox>
                </div>

            </div>
            <div class="mt-3 dropDowndxe">
                <div style="display: flex;">
                    <label>Current Image : </label>
                    <asp:Image runat="server" ID="SubSubOptionImage" AlternateText="No image available" Width="150px" Height="150px" Style="margin-left: 35px;" />
                </div>
                <div class="mt-8" style="display: flex;">
                    <div>
                        <p><label>Image</label></p>
                        <label>(jpeg/jpg/png  < 500 KB, 300px X 300px)</label>
                    </div>
                    <div style="margin-right : 7px;">
                        <label>:</label>
                    </div>
                    <uc1:FileUploader runat="server" ID="FileUploader" FileKey="SubSubOptionImage" Hgt="300" Wid="300" />
                </div>
            </div>
            <div class="mt-3 dropDowndxe">
            </div>
        </div>
        <div class="mt-3">
            <asp:HiddenField ID="hdnSubSubOptionID" runat="server" />
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
            <asp:Button ID="BtnDelete" runat="server" Text="Confirm" OnClick="BtnDelete_Click" CssClass="button bg-theme-1 text-white mt-5 w-24" />
            <asp:Button ID="BtnRemoveCancel" runat="server" Text="Cancel" OnClick="BtnRemoveCancel_Click" CssClass="button w-24 ml-2 mb-2 bg-gray-200 text-gray-600" />
        </dx:PopupControlContentControl>
    </ContentCollection>
    <ContentStyle>
        <Paddings Padding="15px" />
    </ContentStyle>
</dx:ASPxPopupControl>
