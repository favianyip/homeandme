<%@ Page Language="C#" AutoEventWireup="true" CodeFile="ImageCropPage.aspx.cs" Inherits="ImageCropPage" %>

<%@ Register Assembly="DevExpress.Web.v19.2, Version=19.2.5.0, Culture=neutral, PublicKeyToken=b88d1754d700e49a" Namespace="DevExpress.Web" TagPrefix="dx" %>
<%@ Reference Control="~/Admin/Controls/AdminControls/FileUploader.ascx" %>
<!DOCTYPE html>

<html xmlns="http://www.w3.org/1999/xhtml">
<head runat="server">
    <title></title>
    <link href="/Admin/css/croppie.css" rel="stylesheet" type="text/css" />
    <script type="text/javascript" src="/Admin/js/jquery-2.2.1.min.js"></script>
    <script type="text/javascript" src="/Admin/js/croppie.js"></script>
    <style type="text/css">
        .no-display {
            display: none;
        }
    </style>
</head>
<body>
    <form id="form1" runat="server">

        <style type="text/css">
            .upload-result {
                z-index: 111111111111111111111111111;
            }
        </style>
        <script type="text/javascript">
            $(document).ready(function () {
                var $uploadCrop;
                var typp = 'square';

                function readFile() {
                    $uploadCrop.croppie('bind', {
                        url: "'" + $("#<%=hdnPath.ClientID%>").val + "'"
                    });
                }
                var $w = parseInt(<%=hdnWth.Value%>); // Width of cropped Image
                var $h = parseInt(<%=hdnHgt.Value%>); // Height of cropped Image

                $uploadCrop = $('#<%=UploadedImage.ClientID%>').croppie({
                    viewport: {
                        width: (parseInt($w) / 4) + 10,
                        height: (parseInt($h) / 4) + 10,
                        type: typp
                    },
                    boundary: {
                        width: parseInt($w) / 4 + 50,
                        height: parseInt($h) / 4 + 50
                    }
                });
                $uploadCrop.croppie('bind', {
                    url: '<%=hdnPath.Value%>'
                });
                $('.upload-result').on('click', function (ev) {
                    var w = parseInt($w, 10),
                        h = parseInt($h, 10), s
                    size = 'original';
                    if (w || h) {
                        size = { width: w, height: h };
                    }
                    $uploadCrop.croppie('result', {
                        type: 'canvas',
                        size: size,
                        format: 'jpeg,png,jpg',
                        quality: 0.9
                    }).then(function (resp) {
                        $('#<%=hdnImagebase64.ClientID%>').val(resp);
                            __doPostBack('btnCrop', '');
                        });
                })
            });
        </script>
        <asp:HiddenField ID="hdnKey" runat="server" Value="" />
        <asp:HiddenField ID="hdnPath" runat="server" Value="" />
        <asp:HiddenField ID="hdnWth" runat="server" Value="800" />
        <asp:HiddenField ID="hdnHgt" runat="server" Value="800" />
        <div id="UploadedImage" runat="server"></div>
        <asp:HiddenField ID="hdnImagebase64" runat="server" />
        <div style="margin: 0px auto; clear: both; text-align: center;">
            <asp:Button CssClass="btn btn-primary no-display " ID="btnCrop" UseSubmitBehavior="false" runat="server" Text="Crop" OnClick="btnCrop_Click" OnClientClick="javascript:void(0);" /><a href="javascript:void(0);" class="upload-result btn btn-yellow upload-result">Crop</a>&nbsp;&nbsp;<asp:LinkButton CssClass="btn btn-grey upload-result" ID="btnCancel" runat="server" Text="Cancel" OnClick="btnCancel_Click" /><br />
            <asp:Label ID="lblMsg" runat="server" CssClass="label label-info"></asp:Label>
        </div>
        <div style="display: none;">
            <img id="imgCropdImage" runat="server" src="" />
        </div>
    </form>
</body>
</html>

