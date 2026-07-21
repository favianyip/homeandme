<%@ Page Title="" Language="C#" MasterPageFile="~/DashboardMasterPage.master" AutoEventWireup="true" CodeFile="PropertyDetails.aspx.cs" Inherits="PropertyDetails" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Register Assembly="AjaxControlToolkit" Namespace="AjaxControlToolkit" TagPrefix="asp" %>

<asp:Content ID="Content1" ContentPlaceHolderID="head" runat="Server">
    <script type="text/javascript">
        function previewFile() {
            var preview = document.querySelector('#<%=imgPreview.ClientID %>');
            var file = document.querySelector('#<%=GalleryImageUpload.ClientID %>').files[0];
            var reader = new FileReader();

            reader.onloadend = function () {
                preview.src = reader.result;
            }

            if (file) {
                reader.readAsDataURL(file);
            } else {
                preview.src = "";
            }
        }
        function ShowInvalidModal() {
            debugger;
            document.getElementById("InvalidModal").style.display = "block";
            document.getElementById("InvalidModal").classList.remove("fade")
        }
        function CloseInvalidModal() {
            debugger;
            document.getElementById("InvalidModal").style.display = "none";
            document.getElementById("InvalidModal").classList.add("fade")
        }
        function openInvalidMessageModal() {
            $('#InvalidModal').modal('show');
        }
    </script>
</asp:Content>
<asp:Content ID="Content2" ContentPlaceHolderID="ContentPlaceHolder1" runat="Server">
    <asp:ToolkitScriptManager ID="sm" runat="server" />
    <h2 class="hnm-sub-head">Property Details</h2>
    <div class="hnm-box-head hnm-box-head--two-col">
        <div class="hnm-box-head__inner">
            <h3 class="hnm-box-head__title">Property Details</h3>
            <div class="hnm-box-head__cnt">
                <p class="hnm-my-project__property-label">Property type :</p>
                <p class="hnm-my-project__property-txt">
                    <asp:Label ID="lblPropertyType" runat="server"></asp:Label>
                </p>
                <p class="hnm-my-project__property-label">Flat type :</p>
                <p class="hnm-my-project__property-txt">
                    <asp:Label ID="lblFlatType" runat="server"></asp:Label>
                </p>
            </div>
        </div>
        <div class="hnm-box-head__inner">
            <h3 class="hnm-box-head__title">Documents uploaded</h3>
            <div class="hnm-box-head__cnt">
                <div class="hnm-my-project__doc-box" id="DivFloorPlanForm" runat="server">
                    <asp:Label ID="lblFloorPlanForm" runat="server"></asp:Label>
                    <asp:Image ID="ImgFloorPlanForm" runat="server" />
                </div>
                <div class="hnm-my-project__doc-box" id="DivPermitForm" runat="server">
                    <asp:Label ID="lblPermitForm" runat="server"></asp:Label>
                    <asp:Image ID="ImgPermitForm" runat="server" />
                </div>
                <div class="hnm-my-project__doc-box" id="DivIndemnityForm" runat="server">
                    <asp:Label ID="lblIndemnityForm" runat="server"></asp:Label>
                    <asp:Image ID="ImgIndemnityForm" runat="server" />
                </div>
                <asp:LinkButton ID="lnkUploadDocuments" runat="server" CssClass="hnm-button hnm-button--secondary" OnClick="lnkUploadDocuments_Click">UPLOAD PENDING DOCUMENTS</asp:LinkButton>
                <!-- Upload documents Popup Start -->
                <div class="modal fade hnm-modal hnm-modal--upload-docs" id="uploadPendingModal" tabindex="-1" aria-hidden="true" runat="server">
                    <div class="modal-dialog  modal-dialog-centered">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Upload pending documents</h5>
                                <asp:LinkButton ID="lnkClosePopUp" runat="server" CssClass="close" OnClick="lnkClosePopUp_Click"><span aria-hidden="true">&times;</span></asp:LinkButton>
                            </div>
                            <div class="modal-body">
                                <div class="hnm-modal__upload-box">
                                    <p class="hnm-modal__desc">Upload Floor Plan:</p>
                                    <p class="hnm-modal__text-grey">Please upload the renovation permit (PDF, JPG or PNG). Image can be a maximum of 16 MB in size</p>
                                    <div class="hnm-uploadfiletext" id="DivDwldFloorPlan" runat="server">
                                        <asp:Label ID="lblFloorPlanFile" runat="server"></asp:Label>
                                        <asp:LinkButton ID="lnkDwnldFloorPlan" runat="server" OnClick="lnkDwnldFloorPlan_Click">Download</asp:LinkButton>
                                    </div>
                                    <div class="hnm-file">
                                        <asp:FileUpload ID="FloorPlanUpload" runat="server" class="hnm-file__input" />
                                        <p class="hnm-file__txt"></p>
                                        <label for="ContentPlaceHolder1_FloorPlanUpload" class="hnm-button">Browse</label>
                                    </div>
                                    <asp:RegularExpressionValidator ID="ReqFloorUpload" runat="server" ErrorMessage="Only PNG,JPG,PDF file is allowed!"
                                        ValidationExpression="(.*png$)|(.*jpg$)|(.*jpeg$)|(.*pdf)"
                                        SetFocusOnError="true" ControlToValidate="FloorPlanUpload" ValidationGroup="Page" ForeColor="Red"
                                        Font-Size="X-Small" Display="Dynamic"> </asp:RegularExpressionValidator>
                                </div>
                                <div class="hnm-modal__upload-box">
                                    <p class="hnm-modal__desc">Upload renovation permit:</p>
                                    <p class="hnm-modal__text-grey">Please upload the renovation permit (PDF, JPG or PNG). Image can be a maximum of 16 MB in size</p>
                                    <div class="hnm-uploadfiletext" id="DivDwldPermit" runat="server">
                                        <asp:Label ID="lblRenovationPermitFile" runat="server"></asp:Label>
                                        <asp:LinkButton ID="lnkDwnldPermit" runat="server" OnClick="lnkDwnldPermit_Click">Download</asp:LinkButton>
                                    </div>
                                    <div class="hnm-file">
                                        <asp:FileUpload ID="RenovationPermitUpload" runat="server" class="hnm-file__input" />
                                        <p class="hnm-file__txt"></p>
                                        <label for="ContentPlaceHolder1_RenovationPermitUpload" class="hnm-button">Browse</label>
                                    </div>
                                    <asp:RegularExpressionValidator ID="ReqRenovationPermit" runat="server" ErrorMessage="Only PNG,JPG,PDF file is allowed!"
                                        ValidationExpression="(.*png$)|(.*jpg$)|(.*jpeg$)|(.*pdf)"
                                        SetFocusOnError="true" ControlToValidate="RenovationPermitUpload" ValidationGroup="Page" ForeColor="Red"
                                        Font-Size="X-Small" Display="Dynamic"> </asp:RegularExpressionValidator>
                                </div>
                                <div class="hnm-modal__upload-box">
                                    <p class="hnm-modal__desc">Upload Indemnity:</p>
                                    <p class="hnm-modal__text-grey">Please upload the renovation permit (PDF, JPG or PNG). Image can be a maximum of 16 MB in size</p>
                                    <div class="hnm-uploadfiletext" id="DivDwldIndemnity" runat="server">
                                        <asp:Label ID="lblIndemnityFile" runat="server"></asp:Label>
                                        <asp:LinkButton ID="lnkDwnldIndemnity" runat="server" OnClick="lnkDwnldIndemnity_Click">Download</asp:LinkButton>
                                    </div>
                                    <div class="hnm-file">
                                        <asp:FileUpload ID="IndemnityFileUpload" runat="server" class="hnm-file__input" />
                                        <p class="hnm-file__txt"></p>
                                        <label for="ContentPlaceHolder1_IndemnityFileUpload" class="hnm-button">Browse</label>
                                    </div>
                                    <asp:RegularExpressionValidator ID="ReqIndemnityFileUpload" runat="server" ErrorMessage="Only PNG,JPG,PDF file is allowed!"
                                        ValidationExpression="(.*png$)|(.*jpg$)|(.*jpeg$)|(.*pdf)"
                                        SetFocusOnError="true" ControlToValidate="IndemnityFileUpload" ValidationGroup="Page" ForeColor="Red"
                                        Font-Size="X-Small" Display="Dynamic"> </asp:RegularExpressionValidator>
                                </div>
                                <div>
                                    <asp:Label ID="lblMessage" runat="server" Visible="false" ForeColor="Red"></asp:Label>
                                </div>
                                <div class="hnm-modal__btn">
                                    <asp:Button ID="btnCancelFiles" runat="server" Text="Cancel" CssClass="hnm-button hnm-button--secondary" OnClick="btnCancelFiles_Click" />
                                    <asp:Button ID="btnSaveFiles" runat="server" Text="Save" CssClass="hnm-button" OnClick="btnSaveFiles_Click" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <!-- Upload documents Popup End -->
            </div>
        </div>
    </div>
    <div class="hnm-upload-box__outer hnm-r-mt-5">
        <div class="hnm-upload-box">
            <h2 class="hnm-sub-head">Project Gallery</h2>
            <div class="hnm-upload-box__inner">
                <div class="hnm-upload-box__sec-1">
                    <img src="" alt="" class="hnm-upload-box__img" id="imgPreview" runat="server" />
                </div>
                <div class="hnm-upload-box__sec-2">
                    <div class="hnm-upload-box__input-sec">
                        <asp:FileUpload ID="GalleryImageUpload" runat="server" class="hnm-upload-box__input" onchange="previewFile()" />
                        <label for="ContentPlaceHolder1_GalleryImageUpload">
                            <span>Add Images</span><svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" class="hnm-upload-box__add-icon">
                                <circle cx="20" cy="20" r="19.5" stroke="#5A7E8A" />
                                <path d="M20.583 7.34717V33.4696" stroke="#D9D9D9" stroke-width="2" />
                                <path d="M7.34766 20.5822L33.4701 20.5822" stroke="#D9D9D9" stroke-width="2" />
                            </svg>
                        </label>
                    </div>
                    <div class="hnm-upload-box__btn-sec">
                        <asp:LinkButton ID="lnkSaveGalleryImages" runat="server" CssClass="hnm-button" OnClick="lnkSaveGalleryImages_Click">Save</asp:LinkButton>
                    </div>
                </div>
            </div>
        </div>
        <div class="hnm-uploaded-carousal">
            <div class="hnm-uploaded-carousal__inner">
                <asp:Repeater runat="server" ID="rptProjectGallery">
                    <ItemTemplate>
                        <div class="hnm-uploaded-carousal__img-sec" data-toggle="modal" data-target='<%# "#imgSlider" + DataBinder.Eval(Container.DataItem, "ProjectGalleryID") %>'>
                            <img src='<%# Eval("ImagePath") %>' alt="image">
                        </div>
                    </ItemTemplate>
                </asp:Repeater>
            </div>
        </div>
    </div>
    <asp:Literal ID="litGalleryImagePopUp" runat="server"></asp:Literal>
    <div class="modal fade hnm-modal hnm-modal__points" id="InvalidModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog  modal-dialog-centered">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Message</h5>
                    <button type="button" class="close" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">&times;</span>
                    </button>
                </div>
                <div class="modal-body">
                    <p class="hnm-modal__desc"><asp:Label ID="lblPopUpMessage" runat="server"></asp:Label></p>
                </div>
            </div>
        </div>
    </div>
</asp:Content>

